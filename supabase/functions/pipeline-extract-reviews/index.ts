import { getPipelineEnv } from "../_shared/env.ts";
import { finalizeSummary, jsonResponse, newSummary, readPipelineRequest } from "../_shared/http.ts";
import { extractReviewWithLlm } from "../_shared/openai.ts";
import {
  findDecisionFallbackWindows,
  findMentionWindows,
  inferConfidence,
  inferSentiment,
  inferTags,
  looksLikeConcreteClaim,
} from "../_shared/reviews.ts";
import { SupabaseRestClient } from "../_shared/supabase-rest.ts";
import { fetchTranscriptSegments } from "../_shared/transcript.ts";
import type { MentionRow, ToolRow, TranscriptSegment } from "../_shared/types.ts";

const FUNCTION_NAME = "pipeline-extract-reviews";

type VideoWithChannel = {
  id: string;
  youtube_video_id: string;
  title: string;
  video_url: string | null;
  published_at: string | null;
  youtube_channels: { name: string | null } | null;
};

type ExistingSnippetRow = {
  id: string;
  extraction_confidence: number | null;
};

type CachedTranscriptRow = {
  video_id: string;
  youtube_video_id: string;
  segments_json: unknown;
};

function inFilter(ids: string[]): string {
  return `in.(${ids.join(",")})`;
}

function normalizeCachedSegments(input: unknown): TranscriptSegment[] {
  if (!Array.isArray(input)) return [];
  const out: TranscriptSegment[] = [];
  for (const item of input) {
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;
    const start = Number(obj.startSeconds);
    const duration = Number(obj.durationSeconds);
    const text = typeof obj.text === "string" ? obj.text.trim() : "";
    if (!Number.isFinite(start) || !text) continue;
    out.push({
      startSeconds: Math.max(0, Math.floor(start)),
      durationSeconds: Number.isFinite(duration) && duration > 0 ? Math.floor(duration) : 1,
      text,
    });
  }
  return out;
}

function toTranscriptText(segments: TranscriptSegment[]): string {
  return segments.map((s) => s.text).join(" ").replace(/\s+/g, " ").trim();
}

Deno.serve(async (req) => {
  const summary = newSummary(FUNCTION_NAME);

  try {
    const payload = await readPipelineRequest(req);
    const env = getPipelineEnv();
    const db = new SupabaseRestClient({
      supabaseUrl: env.supabaseUrl,
      serviceRoleKey: env.serviceRoleKey,
    });

    const dryRun = payload.dry_run === true;
    const reprocessVideos = payload.reprocess_videos === true;
    const cacheOnly = payload.cache_only === true;
    const nowIso = new Date().toISOString();
    const llmEnabled = Boolean(env.openAiApiKey);
    if (!llmEnabled) summary.warnings.push("OPENAI_API_KEY not set; using heuristic extraction fallback.");
    const maxVideos = payload.limit_videos_per_tool && payload.limit_videos_per_tool > 0
      ? payload.limit_videos_per_tool * Math.max(payload.limit_tools ?? 20, 20)
      : 200;

    const tools = await db.select<ToolRow>("tools", {
      select: "id,slug,name",
      order: "name.asc",
      limit: "1000",
    });

    let activeTools = tools;
    if ((payload.tool_ids?.length ?? 0) > 0) {
      const wanted = new Set(payload.tool_ids!.map((v) => v.toLowerCase()));
      activeTools = tools.filter((tool) => wanted.has(tool.id.toLowerCase()) || wanted.has(tool.slug.toLowerCase()));
    }
    summary.tools_scanned = activeTools.length;

    const activeToolIds = new Set(activeTools.map((tool) => tool.id));
    const toolNameById = new Map(activeTools.map((tool) => [tool.id, tool.name]));

    const scopedMentions = await db.select<MentionRow>("video_mentions", {
      select: "id,tool_id,video_id",
      tool_id: inFilter([...activeToolIds]),
      limit: "10000",
    });
    const scopedVideoIds = [...new Set(scopedMentions.map((mention) => mention.video_id))];
    if (scopedVideoIds.length === 0) {
      summary.warnings.push("No videos linked to requested tool scope.");
      return jsonResponse(200, finalizeSummary(summary));
    }

    const videoQuery: Record<string, string> = {
      select: "id,youtube_video_id,title,video_url,published_at,youtube_channels(name)",
      id: inFilter(scopedVideoIds),
      order: "published_at.desc",
      limit: String(maxVideos),
    };
    if (!reprocessVideos) {
      videoQuery.processed_at = "is.null";
    }
    const videos = await db.select<VideoWithChannel>("youtube_videos", videoQuery);
    if (videos.length === 0) {
      summary.warnings.push(
        reprocessVideos
          ? "No scoped videos found."
          : "No scoped videos found with processed_at IS NULL.",
      );
      return jsonResponse(200, finalizeSummary(summary));
    }
    const videoIds = videos.map((video) => video.id);
    const cachedRows = await db.select<CachedTranscriptRow>("video_transcripts", {
      select: "video_id,youtube_video_id,segments_json",
      video_id: inFilter(videoIds),
      limit: "10000",
    });
    const cachedByVideoId = new Map(cachedRows.map((row) => [row.video_id, row]));

    const mentions = scopedMentions.filter((mention) => scopedVideoIds.includes(mention.video_id));

    const mentionsByVideo = new Map<string, MentionRow[]>();
    for (const mention of mentions) {
      if (!activeToolIds.has(mention.tool_id)) continue;
      const list = mentionsByVideo.get(mention.video_id) ?? [];
      list.push(mention);
      mentionsByVideo.set(mention.video_id, list);
    }

    let okTranscriptCount = 0;
    for (const video of videos) {
      const videoMentions = mentionsByVideo.get(video.id) ?? [];
      if (videoMentions.length === 0) {
        if (!dryRun) {
          await db.update(
            "youtube_videos",
            { processed_at: nowIso, transcript_status: "failed" },
            { id: `eq.${video.id}` },
            "minimal",
          );
        }
        continue;
      }

      summary.videos_scanned += 1;
      const cached = cachedByVideoId.get(video.id);
      let segments = normalizeCachedSegments(cached?.segments_json);

      if (segments.length === 0) {
        if (cacheOnly) {
          if (!dryRun) {
            await db.update(
              "youtube_videos",
              { processed_at: nowIso, transcript_status: "missing" },
              { id: `eq.${video.id}` },
              "minimal",
            );
          }
          continue;
        }
        try {
          segments = await fetchTranscriptSegments(video.youtube_video_id, env.transcriptTimeoutMs);
        } catch (error) {
          summary.errors.push(
            `Transcript fetch failed for ${video.youtube_video_id}: ${error instanceof Error ? error.message : String(error)}`,
          );
          if (!dryRun) {
            await db.update(
              "youtube_videos",
              { processed_at: nowIso, transcript_status: "failed" },
              { id: `eq.${video.id}` },
              "minimal",
            );
          }
          continue;
        }

        if (!dryRun && segments.length > 0) {
          await db.upsert(
            "video_transcripts",
            {
              video_id: video.id,
              youtube_video_id: video.youtube_video_id,
              transcript_text: toTranscriptText(segments),
              segments_json: segments,
              source: "youtube_scrape",
              fetched_at: nowIso,
              updated_at: nowIso,
            },
            { onConflict: "video_id", returning: "minimal" },
          );
        }
      }

      if (segments.length === 0) {
        if (!dryRun) {
          await db.update(
            "youtube_videos",
            { processed_at: nowIso, transcript_status: "missing" },
            { id: `eq.${video.id}` },
            "minimal",
          );
        }
        continue;
      }
      okTranscriptCount += 1;

      for (const mention of videoMentions) {
        const toolName = toolNameById.get(mention.tool_id);
        if (!toolName) continue;

        const mentionWindows = findMentionWindows(segments, toolName, 45).slice(0, 3);
        const windows = mentionWindows.length > 0
          ? mentionWindows
          : findDecisionFallbackWindows(segments, 1, 45);
        for (const window of windows) {
          const windowText = window.text.slice(0, 700).trim();

          let snippetText = "";
          let sentiment: "Pro" | "Con" | "Neutral" = "Neutral";
          let tags: string[] = ["Other"];
          let sponsoredFlag = false;
          let confidence = 0;

          if (llmEnabled) {
            try {
              const llm = await extractReviewWithLlm({
                apiKey: env.openAiApiKey!,
                model: env.reviewModel,
                toolName,
                transcriptWindow: windowText,
              });
              if (!llm) continue;
              snippetText = llm.quote_text;
              sentiment = llm.sentiment;
              tags = llm.topics.length > 0 ? llm.topics : ["Other"];
              sponsoredFlag = llm.sponsored_flag;
              confidence = llm.confidence;
            } catch (error) {
              summary.warnings.push(
                `LLM extraction failed for ${video.youtube_video_id}: ${error instanceof Error ? error.message : String(error)}`,
              );
              continue;
            }
          } else {
            snippetText = windowText;
            if (!looksLikeConcreteClaim(snippetText)) continue;
            sentiment = inferSentiment(snippetText);
            tags = inferTags(snippetText);
            sponsoredFlag = /sponsor|sponsored|affiliate|partner/i.test(snippetText);
            confidence = inferConfidence(snippetText);
          }

          if (!snippetText) continue;
          if (confidence < env.minConfidence) continue;

          const timestamp = Math.max(0, Math.floor(window.startSeconds));
          const lowTs = Math.max(0, timestamp - 5);
          const highTs = timestamp + 5;

          const existing = await db.select<ExistingSnippetRow>("review_snippets", {
            select: "id,extraction_confidence",
            tool_id: `eq.${mention.tool_id}`,
            video_id: `eq.${video.id}`,
            and: `(receipt_timestamp_seconds.gte.${lowTs},receipt_timestamp_seconds.lte.${highTs})`,
            limit: "1",
          });

          if (existing.length > 0) {
            const existingConfidence = existing[0].extraction_confidence ?? 0;
            if (!dryRun && confidence > existingConfidence) {
              await db.update(
                "review_snippets",
                {
                  sentiment,
                  tags,
                  snippet_text: snippetText,
                  raw_snippet_text: snippetText,
                  sponsored_flag: sponsoredFlag,
                  extraction_confidence: confidence,
                },
                { id: `eq.${existing[0].id}` },
                "minimal",
              );
            }
            summary.duplicates_skipped += 1;
            continue;
          }

          if (dryRun) {
            summary.snippets_upserted += 1;
            continue;
          }

          await db.insert(
            "review_snippets",
            {
              tool_id: mention.tool_id,
              video_id: video.id,
              sentiment,
              tags,
              snippet_text: snippetText,
              raw_snippet_text: snippetText,
              video_title: video.title,
              channel_name: video.youtube_channels?.name ?? null,
              publish_date: video.published_at ? video.published_at.slice(0, 10) : null,
              receipt_timestamp_seconds: timestamp,
              receipt_url: `${video.video_url ?? `https://www.youtube.com/watch?v=${video.youtube_video_id}`}&t=${timestamp}s`,
              sponsored_flag: sponsoredFlag,
              extraction_confidence: confidence,
            },
            "minimal",
          );
          summary.snippets_upserted += 1;
        }
      }

      if (!dryRun) {
        await db.update(
          "youtube_videos",
          { processed_at: nowIso, transcript_status: "ok" },
          { id: `eq.${video.id}` },
          "minimal",
        );
      }
    }

    if (summary.videos_scanned > 0 && summary.snippets_upserted === 0 && okTranscriptCount === 0) {
      summary.errors.push("No transcripts available for scoped videos. Review extraction produced zero snippets.");
    } else if (summary.videos_scanned > 0 && summary.snippets_upserted === 0) {
      summary.warnings.push("Transcript fetch succeeded for some videos, but no concrete review snippets passed filters.");
    }

    return jsonResponse(200, finalizeSummary(summary));
  } catch (error) {
    summary.errors.push(error instanceof Error ? error.message : String(error));
    return jsonResponse(500, finalizeSummary(summary));
  }
});

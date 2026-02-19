import { extractDealsFromDescription, normalizeTextForMatch } from "../_shared/deals.ts";
import { getPipelineEnv } from "../_shared/env.ts";
import { finalizeSummary, jsonResponse, newSummary, readPipelineRequest } from "../_shared/http.ts";
import { SupabaseRestClient } from "../_shared/supabase-rest.ts";
import type { DealCandidate, MentionRow, ToolRow, VideoRow } from "../_shared/types.ts";

const FUNCTION_NAME = "pipeline-extract-deals";

type ToolCategoryRow = {
  tool_id: string;
  categories: { name: string | null } | null;
};

type ExistingDealRow = {
  id: string;
  offer_text: string;
};

function inFilter(ids: string[]): string {
  return `in.(${ids.join(",")})`;
}

async function findExistingDeal(
  db: SupabaseRestClient,
  toolId: string,
  candidate: DealCandidate,
): Promise<string | null> {
  if (candidate.code) {
    const rows = await db.select<ExistingDealRow>("deals", {
      select: "id,offer_text",
      tool_id: `eq.${toolId}`,
      code: `eq.${candidate.code}`,
      limit: "1",
    });
    if (rows[0]?.id) return rows[0].id;

    if (candidate.link_url) {
      const linkRows = await db.select<ExistingDealRow>("deals", {
        select: "id,offer_text",
        tool_id: `eq.${toolId}`,
        link_url: `eq.${candidate.link_url}`,
        limit: "1",
      });
      return linkRows[0]?.id ?? null;
    }

    return null;
  }

  if (candidate.link_url) {
    const rows = await db.select<ExistingDealRow>("deals", {
      select: "id,offer_text",
      tool_id: `eq.${toolId}`,
      link_url: `eq.${candidate.link_url}`,
      limit: "1",
    });
    return rows[0]?.id ?? null;
  }

  const token = normalizeTextForMatch(candidate.offer_text).slice(0, 32).replace(/[^a-z0-9 ]/g, "").trim();
  if (!token) return null;

  const rows = await db.select<ExistingDealRow>("deals", {
    select: "id,offer_text",
    tool_id: `eq.${toolId}`,
    offer_text: `ilike.*${token}*`,
    limit: "20",
  });
  const matched = rows.find((row) => normalizeTextForMatch(row.offer_text).includes(token));
  return matched?.id ?? null;
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

    const tools = await db.select<ToolRow & { website_url?: string | null }>("tools", {
      select: "id,slug,name,website_url",
      order: "name.asc",
      limit: "1000",
    });
    let targetTools = tools;
    if ((payload.tool_ids?.length ?? 0) > 0) {
      const wanted = new Set(payload.tool_ids!.map((v) => v.toLowerCase()));
      targetTools = tools.filter((tool) => wanted.has(tool.id.toLowerCase()) || wanted.has(tool.slug.toLowerCase()));
    }
    summary.tools_scanned = targetTools.length;
    const toolById = new Map(targetTools.map((tool) => [tool.id, tool]));

    const targetToolIds = new Set(targetTools.map((tool) => tool.id));
    const mentions = await db.select<MentionRow>("video_mentions", {
      select: "id,tool_id,video_id",
      tool_id: inFilter([...targetToolIds]),
      limit: "10000",
    });
    const scopedVideoIds = [...new Set(mentions.map((mention) => mention.video_id))];
    if (scopedVideoIds.length === 0) {
      summary.warnings.push("No videos linked to requested tool scope.");
      return jsonResponse(200, finalizeSummary(summary));
    }

    const videos = await db.select<VideoRow>("youtube_videos", {
      select: "id,youtube_video_id,title,description,video_url,published_at",
      id: inFilter(scopedVideoIds),
      deals_parsed_at: "is.null",
      order: "published_at.desc",
      limit: "300",
    });
    if (videos.length === 0) {
      summary.warnings.push("No scoped videos found with deals_parsed_at IS NULL.");
      return jsonResponse(200, finalizeSummary(summary));
    }

    const mentionsByVideo = new Map<string, string[]>();
    for (const mention of mentions) {
      if (!targetToolIds.has(mention.tool_id)) continue;
      const list = mentionsByVideo.get(mention.video_id) ?? [];
      list.push(mention.tool_id);
      mentionsByVideo.set(mention.video_id, list);
    }

    const toolCategoryRows = await db.select<ToolCategoryRow>("tool_categories", {
      select: "tool_id,categories(name)",
      limit: "10000",
    });
    const categoryByToolId = new Map<string, string[]>();
    for (const row of toolCategoryRows) {
      const categoryName = row.categories?.name;
      if (!categoryName) continue;
      const list = categoryByToolId.get(row.tool_id) ?? [];
      list.push(categoryName);
      categoryByToolId.set(row.tool_id, [...new Set(list)]);
    }

    const nowIso = new Date().toISOString();
    for (const video of videos) {
      const toolIds = mentionsByVideo.get(video.id) ?? [];
      if (toolIds.length === 0) {
        if (!dryRun) {
          await db.update("youtube_videos", { deals_parsed_at: nowIso }, { id: `eq.${video.id}` }, "minimal");
        }
        continue;
      }

      summary.videos_scanned += 1;
      for (const toolId of toolIds) {
        const tool = toolById.get(toolId);
        if (!tool) continue;
        const candidates = extractDealsFromDescription(video.description ?? "", {
          toolName: tool.name,
          toolSlug: tool.slug,
          toolWebsiteUrl: tool.website_url ?? null,
        });
        if (candidates.length === 0) {
          continue;
        }
        const category = categoryByToolId.get(toolId) ?? [];
        for (const candidate of candidates) {
          if (dryRun) {
            summary.deals_upserted += 1;
            continue;
          }

          const existingId = await findExistingDeal(db, toolId, candidate);
          if (existingId) {
            await db.update(
              "deals",
              {
                offer_text: candidate.offer_text,
                offer_type: candidate.offer_type,
                code: candidate.code,
                link_url: candidate.link_url,
                receipt_url: video.video_url ?? `https://www.youtube.com/watch?v=${video.youtube_video_id}`,
                last_seen: nowIso,
                active: true,
                source: "description",
                category,
              },
              { id: `eq.${existingId}` },
              "minimal",
            );
          } else {
            await db.insert(
              "deals",
              {
                tool_id: toolId,
                video_id: video.id,
                offer_text: candidate.offer_text,
                offer_type: candidate.offer_type,
                code: candidate.code,
                link_url: candidate.link_url,
                receipt_url: video.video_url ?? `https://www.youtube.com/watch?v=${video.youtube_video_id}`,
                receipt_timestamp_seconds: null,
                active: true,
                last_seen: nowIso,
                source: "description",
                category,
              },
              "minimal",
            );
          }
          summary.deals_upserted += 1;
        }
      }

      if (!dryRun) {
        await db.update("youtube_videos", { deals_parsed_at: nowIso }, { id: `eq.${video.id}` }, "minimal");
      }
    }

    return jsonResponse(200, finalizeSummary(summary));
  } catch (error) {
    summary.errors.push(error instanceof Error ? error.message : String(error));
    return jsonResponse(500, finalizeSummary(summary));
  }
});

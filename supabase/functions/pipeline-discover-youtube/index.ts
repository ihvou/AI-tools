import { getPipelineEnv } from "../_shared/env.ts";
import { finalizeSummary, jsonResponse, newSummary, readPipelineRequest } from "../_shared/http.ts";
import { SupabaseRestClient } from "../_shared/supabase-rest.ts";
import type { ToolRow } from "../_shared/types.ts";
import { mentionsToolInMetadata, YouTubeClient } from "../_shared/youtube.ts";

const FUNCTION_NAME = "pipeline-discover-youtube";

type ChannelUpsertRow = {
  id: string;
  youtube_channel_id: string;
};

type VideoUpsertRow = {
  id: string;
  youtube_video_id: string;
};

Deno.serve(async (req) => {
  const summary = newSummary(FUNCTION_NAME);

  try {
    const payload = await readPipelineRequest(req);
    const env = getPipelineEnv({ requireYoutube: true });
    const db = new SupabaseRestClient({
      supabaseUrl: env.supabaseUrl,
      serviceRoleKey: env.serviceRoleKey,
    });
    const youtube = new YouTubeClient(env.youtubeApiKey!);

    let tools = await db.select<ToolRow>("tools", {
      select: "id,slug,name",
      order: "name.asc",
      limit: "1000",
    });

    if ((payload.tool_ids?.length ?? 0) > 0) {
      const wanted = new Set(payload.tool_ids!.map((v) => v.toLowerCase()));
      tools = tools.filter((tool) => wanted.has(tool.id.toLowerCase()) || wanted.has(tool.slug.toLowerCase()));
    }

    const toolLimit = payload.limit_tools && payload.limit_tools > 0 ? payload.limit_tools : tools.length;
    tools = tools.slice(0, toolLimit);
    summary.tools_scanned = tools.length;

    const maxVideosPerTool = payload.limit_videos_per_tool && payload.limit_videos_per_tool > 0
      ? payload.limit_videos_per_tool
      : env.defaultVideoLimit;
    const dryRun = payload.dry_run === true;

    for (const tool of tools) {
      try {
        const searchTerms = [`${tool.name} review`, `${tool.name} tutorial`];
        const candidateVideoIds = new Set<string>();

        for (const term of searchTerms) {
          const items = await youtube.searchVideos(term, maxVideosPerTool);
          for (const item of items) {
            candidateVideoIds.add(item.videoId);
          }
        }

        const details = await youtube.getVideoDetails([...candidateVideoIds].slice(0, maxVideosPerTool));
        for (const detail of details) {
          summary.videos_scanned += 1;
          if (!mentionsToolInMetadata(tool.name, detail.title, detail.description)) continue;

          if (dryRun) {
            summary.videos_upserted += 1;
            summary.mentions_upserted += 1;
            continue;
          }

          const channelRows = await db.upsert<ChannelUpsertRow>(
            "youtube_channels",
            {
              youtube_channel_id: detail.channelId,
              name: detail.channelTitle || "Unknown channel",
              handle: null,
              channel_url: `https://www.youtube.com/channel/${detail.channelId}`,
            },
            { onConflict: "youtube_channel_id", returning: "representation" },
          );
          const channelId = channelRows[0]?.id ?? null;

          const videoRows = await db.upsert<VideoUpsertRow>(
            "youtube_videos",
            {
              youtube_video_id: detail.videoId,
              channel_id: channelId,
              title: detail.title,
              description: detail.description,
              video_url: `https://www.youtube.com/watch?v=${detail.videoId}`,
              published_at: detail.publishedAt,
            },
            { onConflict: "youtube_video_id", returning: "representation" },
          );
          const videoId = videoRows[0]?.id;
          if (!videoId) continue;
          summary.videos_upserted += 1;

          await db.upsert(
            "video_mentions",
            {
              tool_id: tool.id,
              video_id: videoId,
              mention_count: 1,
              first_mentioned_second: 0,
              last_mentioned_second: 0,
              extraction_confidence: 0.5,
            },
            { onConflict: "tool_id,video_id,first_mentioned_second", returning: "minimal" },
          );
          summary.mentions_upserted += 1;
        }
      } catch (error) {
        summary.errors.push(`Tool ${tool.slug}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return jsonResponse(200, finalizeSummary(summary));
  } catch (error) {
    summary.errors.push(error instanceof Error ? error.message : String(error));
    return jsonResponse(500, finalizeSummary(summary));
  }
});

export type PipelineRunMode = "scheduled" | "manual";

export type PipelineRequest = {
  run_mode?: PipelineRunMode;
  tool_ids?: string[];
  limit_tools?: number;
  limit_videos_per_tool?: number;
  dry_run?: boolean;
  stale_days?: number;
  reprocess_videos?: boolean;
  cache_only?: boolean;
};

export type PipelineSummary = {
  ok: boolean;
  run_id: string;
  function_name: string;
  started_at: string;
  finished_at: string;
  duration_ms: number;
  tools_scanned: number;
  videos_scanned: number;
  videos_upserted: number;
  mentions_upserted: number;
  deals_upserted: number;
  snippets_upserted: number;
  duplicates_skipped: number;
  warnings: string[];
  errors: string[];
};

export type ToolRow = {
  id: string;
  slug: string;
  name: string;
};

export type VideoRow = {
  id: string;
  youtube_video_id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  published_at: string | null;
  channel_id: string | null;
};

export type MentionRow = {
  id: string;
  tool_id: string;
  video_id: string;
  tools?: { name: string; slug: string } | null;
};

export type YouTubeSearchItem = {
  videoId: string;
  title: string;
  description: string;
};

export type YouTubeVideoDetail = {
  videoId: string;
  title: string;
  description: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
};

export type TranscriptSegment = {
  startSeconds: number;
  durationSeconds: number;
  text: string;
};

export type DealCandidate = {
  offer_text: string;
  offer_type: "Code" | "Link" | "Trial extension" | "Credit bonus" | "Unknown";
  code: string | null;
  link_url: string | null;
};

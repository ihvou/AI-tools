type PipelineEnv = {
  supabaseUrl: string;
  serviceRoleKey: string;
  youtubeApiKey?: string;
  openAiApiKey?: string;
  reviewModel: string;
  defaultVideoLimit: number;
  minConfidence: number;
  transcriptTimeoutMs: number;
};

type EnvOptions = {
  requireYoutube?: boolean;
};

function parseIntSafe(input: string | undefined, fallback: number): number {
  const n = Number.parseInt(input ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function parseFloatSafe(input: string | undefined, fallback: number): number {
  const n = Number.parseFloat(input ?? "");
  return Number.isFinite(n) ? n : fallback;
}

export function getPipelineEnv(options: EnvOptions = {}): PipelineEnv {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("NEXT_PUBLIC_SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const youtubeApiKey = Deno.env.get("YOUTUBE_API_KEY") ?? undefined;
  const openAiApiKey = Deno.env.get("OPENAI_API_KEY") ?? undefined;

  if (!supabaseUrl) {
    throw new Error("Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL).");
  }
  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY.");
  }
  if (options.requireYoutube && !youtubeApiKey) {
    throw new Error("Missing YOUTUBE_API_KEY.");
  }

  return {
    supabaseUrl,
    serviceRoleKey,
    youtubeApiKey,
    openAiApiKey,
    reviewModel: Deno.env.get("PIPELINE_REVIEW_MODEL") ?? "gpt-4.1-mini",
    defaultVideoLimit: parseIntSafe(Deno.env.get("PIPELINE_DEFAULT_VIDEO_LIMIT"), 5),
    minConfidence: parseFloatSafe(Deno.env.get("PIPELINE_MIN_CONFIDENCE"), 0.45),
    transcriptTimeoutMs: parseIntSafe(Deno.env.get("PIPELINE_TRANSCRIPT_TIMEOUT_MS"), 12000),
  };
}

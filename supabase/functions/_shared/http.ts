import type { PipelineRequest, PipelineSummary } from "./types.ts";

export function jsonResponse(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

export async function readPipelineRequest(req: Request): Promise<PipelineRequest> {
  if (req.method === "GET") {
    return {};
  }
  if (req.method !== "POST") {
    throw new Error(`Unsupported method ${req.method}. Use GET or POST.`);
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return {};
  }

  const body = await req.json().catch(() => ({}));
  if (!body || typeof body !== "object") {
    return {};
  }
  return body as PipelineRequest;
}

export function newSummary(functionName: string): PipelineSummary {
  const now = new Date().toISOString();
  return {
    ok: true,
    run_id: crypto.randomUUID(),
    function_name: functionName,
    started_at: now,
    finished_at: now,
    duration_ms: 0,
    tools_scanned: 0,
    videos_scanned: 0,
    videos_upserted: 0,
    mentions_upserted: 0,
    deals_upserted: 0,
    snippets_upserted: 0,
    duplicates_skipped: 0,
    warnings: [],
    errors: [],
  };
}

export function finalizeSummary(summary: PipelineSummary): PipelineSummary {
  summary.finished_at = new Date().toISOString();
  summary.duration_ms = new Date(summary.finished_at).getTime() - new Date(summary.started_at).getTime();
  summary.ok = summary.errors.length === 0;
  return summary;
}

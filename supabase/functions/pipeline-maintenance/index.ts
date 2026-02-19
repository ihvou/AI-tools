import { getPipelineEnv } from "../_shared/env.ts";
import { finalizeSummary, jsonResponse, newSummary, readPipelineRequest } from "../_shared/http.ts";
import { SupabaseRestClient } from "../_shared/supabase-rest.ts";
import type { ToolRow } from "../_shared/types.ts";

const FUNCTION_NAME = "pipeline-maintenance";

type ReviewAggregateRow = {
  tool_id: string;
  publish_date: string | null;
};

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
    const staleDays = payload.stale_days && payload.stale_days > 0 ? payload.stale_days : 60;
    const staleCutoff = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000).toISOString();

    const tools = await db.select<ToolRow>("tools", {
      select: "id,slug,name",
      order: "name.asc",
      limit: "1000",
    });
    summary.tools_scanned = tools.length;

    const reviews = await db.select<ReviewAggregateRow>("review_snippets", {
      select: "tool_id,publish_date",
      limit: "10000",
    });
    const summaryByTool = new Map<string, { count: number; maxDate: string | null }>();
    for (const row of reviews) {
      const value = summaryByTool.get(row.tool_id) ?? { count: 0, maxDate: null };
      value.count += 1;
      if (row.publish_date && (!value.maxDate || row.publish_date > value.maxDate)) {
        value.maxDate = row.publish_date;
      }
      summaryByTool.set(row.tool_id, value);
    }

    if (!dryRun) {
      for (const tool of tools) {
        const value = summaryByTool.get(tool.id) ?? { count: 0, maxDate: null };
        await db.update(
          "tools",
          {
            review_sources_count: value.count,
            last_seen_review_date: value.maxDate,
          },
          { id: `eq.${tool.id}` },
          "minimal",
        );
      }

      await db.update(
        "deals",
        { active: false },
        {
          active: "eq.true",
          last_seen: `lt.${staleCutoff}`,
        },
        "minimal",
      );
    }

    return jsonResponse(200, finalizeSummary(summary));
  } catch (error) {
    summary.errors.push(error instanceof Error ? error.message : String(error));
    return jsonResponse(500, finalizeSummary(summary));
  }
});

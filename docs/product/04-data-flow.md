# AI Video Ads Hub — Data Flow (MVP Implementation Guide)

This document is the implementation guide for the ingestion pipeline.  
Short answer: yes, Supabase Edge Functions should handle most recurring logic in MVP.

## 0) Architecture Decision (MVP)
Use a hybrid model:
- Supabase Edge Functions: scheduled ingestion, parsing, extraction, dedup, refresh.
- Supabase Postgres: source of truth and idempotent constraints.
- One local/admin script: manual tool seed + occasional metadata edits.

Input sources:
- manual seed list (primary source for MVP bootstrap)
- tool aggregators / public directories (optional, future enrichment)

Keep scope narrow:
- 20-40 manually curated tools.
- Weekly refresh (not real-time).
- Top 3-5 videos per tool for transcript/snippet extraction.

## 1) End-to-End Pipeline
1. Seed/update tools manually in `tools` + `tool_categories`.
2. Weekly discovery function queries YouTube Data API for each tool.
3. Upsert into `youtube_videos`; upsert joins into `video_mentions`.
4. Parse descriptions first to extract deals into `deals`.
5. For selected videos, fetch transcript from timedtext-based library.
6. Extract review snippets with GPT-4o mini into `review_snippets`.
7. Run hard dedup and refresh `last_seen`/counts.
8. Surface data to frontend; accept user reports for bad data.

## 2) Data Contracts and Constraints
Align with schema in `/Users/bobdean/Projects/avh/docs/product/03-tech-architecture.md`.

Required uniqueness/idempotency:
- `youtube_videos.youtube_video_id` unique.
- `video_mentions` unique at least on `(tool_id, video_id)` for MVP behavior.
- `review_snippets` hard dedup key: `(tool_id, video_id, receipt_timestamp_seconds_bucket)`.

Notes:
- Existing schema has `video_mentions unique (tool_id, video_id, first_mentioned_second)`.  
  For MVP, keep `first_mentioned_second = NULL` during discovery and treat `(tool_id, video_id)` as logical uniqueness in code.
- Consider adding a generated bucket field for snippets: `floor(receipt_timestamp_seconds / 5)` to enforce +/-5 second dedup.

Recommended additive fields (if not already present):
- `youtube_videos.processed_at timestamptz` (pipeline progress marker).
- `youtube_videos.transcript_status text` (`pending|ok|missing|failed`).
- `youtube_videos.deals_parsed_at timestamptz`.
- `review_snippets.raw_snippet_text text` (optional, before correction pass).
- `deals.source text` (`description|transcript`).

## 3) Supabase Edge Functions (Concrete Responsibilities)
Implement these functions first:

1. `pipeline-discover-youtube` (scheduled weekly)
- Input: optional `tool_ids[]`; default all active tools.
- For each tool, run 2-3 search queries (`review`, `tutorial`, maybe `vs`).
- Call `search.list`, then `videos.list` for metadata/details.
- Reject videos that do not mention the tool name in title or description.
- Upsert `youtube_channels`, `youtube_videos`, `video_mentions`.
- Set `youtube_videos.processed_at = NULL` for new videos.
- Emit structured run metrics.

2. `pipeline-extract-deals` (scheduled weekly, after discovery)
- Select videos where `deals_parsed_at is null` or updated recently.
- Extract deal candidates from `description` with regex first.
- Optional second pass with GPT-4o mini only when regex confidence is low.
- Upsert into `deals` and update `last_seen`.
- Set `deals_parsed_at`.

3. `pipeline-extract-reviews` (scheduled weekly, after deals)
- Select top N unprocessed videos per tool (N=3-5 for MVP).
- Fetch transcript using timedtext client.
- If missing transcript, set `transcript_status='missing'`, continue.
- Find tool-mention windows (30-60 seconds).
- Send compact chunks to GPT-4o mini in JSON mode.
- Enforce verbatim-quote and concrete-claim rules.
- Apply orthography/name correction pass (strict prompt).
- Upsert `review_snippets` with hard dedup.
- Set `processed_at` and `transcript_status`.

4. `pipeline-maintenance` (scheduled daily or weekly)
- Recompute tool counters (`review_sources_count`, deals count if stored).
- Mark stale deals inactive if not seen for threshold (for example 45-60 days).
- Log summary stats and anomalies.

## 4) Scheduling and Order
Recommended weekly cadence (UTC):
1. Sunday 01:00: `pipeline-discover-youtube`
2. Sunday 02:00: `pipeline-extract-deals`
3. Sunday 03:00: `pipeline-extract-reviews`
4. Sunday 04:00: `pipeline-maintenance`

Retry policy:
- Each function retries failed tool batches up to 2 times.
- Persist failures to logs/table; do not block other tools.

## 5) YouTube API Usage and Quota Budget
MVP assumptions:
- 30 tools.
- 2 search queries per tool.
- `search.list` cost = 100 units/query.

Budget:
- `30 * 2 * 100 = 6000` units/week for searches.
- Metadata calls add overhead but stay inside 10k/day when run weekly in batches.

Guardrails:
- Limit results per query (for example top 5-10).
- Backoff on 403 quota errors and continue next tool.
- Store `last_discovery_at` per tool to avoid accidental repeated runs.

## 6) Deal Extraction Logic (Description First)
Extraction order:
1. Regex rules (fast path):
   - `use code <CODE>`
   - `<N>% off`
   - known affiliate URL patterns
   - Exclude generic free plan/trial CTAs (for example, "start a free trial at X"); these are not deals.
2. LLM normalization (slow path):
   - produce `{offer_text, code, link_url, offer_type, confidence}`
3. Classify `offer_type`:
   - `'Code'` — if a promo code is present
   - `'Link'` — if only an affiliate/referral link is present (no code)
   - `'Trial extension'` — if an extended trial period is offered beyond the standard free tier
   - `'Credit bonus'` — if bonus credits or value are offered
   - `'Unknown'` — if type cannot be determined
   - Note: standard free plans/trials are NOT deals and must be skipped.

Output (store):
- `deals` with: tool_id, offer_text, offer_type, code (optional), link_url (optional), last_seen_date, receipt_url, receipt_timestamp_label.

Storage rules:
- `receipt_url` should point to video URL; timestamp optional when source is description.
- `last_seen` always updated on re-observation.
- Keep previous rows if materially different offer/code; otherwise upsert same deal signature.

## 7) Transcript and Review Extraction Logic
Transcript fetch:
- Use unofficial timedtext library in Edge Function runtime.
- If fetch fails with not-found/disabled captions: mark missing and skip.

Mention detection:
- Match tool name + aliases from `tools.name`, optional alias list.
- Build mention windows around matching segments.

LLM extraction prompt requirements:
- JSON-only output.
- Extract only concrete claims.
- Reject filler/non-claims.
- `sentiment` enum: `Pro|Con|Neutral`.
- `topics` enum controlled list.

Post-processing:
- Strict correction pass: spelling/proper nouns only; no semantic edits.
- If output changed meaning, discard corrected variant and keep raw verbatim or drop.

## 8) Hard Dedup and Data Quality Rules
Review snippet hard dedup:
- Same `tool_id`, same `video_id`, and timestamp within +/-5 seconds => keep one.
- Prefer the row with higher `extraction_confidence`.

Deal dedup:
- For code deals: same `code` + same `tool_id`.
- For link deals: same `tool_id` + same `link_url`.
- Fallback: same `tool_id` + same `offer_text` (fuzzy match).

Quality thresholds:
- Drop snippets with confidence below threshold (for example `< 0.55`) unless manually reviewed.
- Drop quotes shorter than minimal signal (for example < 8 words) unless explicit claim.

## 9) Function I/O Contracts (Minimal)
Use a shared payload shape for manual and cron invocation:

```json
{
  "run_mode": "scheduled",
  "tool_ids": [],
  "limit_tools": 0,
  "limit_videos_per_tool": 5,
  "dry_run": false
}
```

Return structured summary:

```json
{
  "ok": true,
  "run_id": "uuid",
  "tools_scanned": 30,
  "videos_upserted": 120,
  "deals_upserted": 44,
  "snippets_upserted": 210,
  "errors": []
}
```

## 10) Environment Variables and Secrets
Required:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `YOUTUBE_API_KEY`
- `OPENAI_API_KEY`

Optional:
- `PIPELINE_DEFAULT_VIDEO_LIMIT`
- `PIPELINE_MIN_CONFIDENCE`
- `PIPELINE_TRANSCRIPT_TIMEOUT_MS`

Security:
- Keep functions server-only.
- Never expose service role or third-party API keys to frontend.
- Use RLS + service role only inside Edge Functions.

## 11) Observability and Failure Handling
Minimum observability for MVP:
- Structured JSON logs with `run_id`, `function_name`, `tool_id`, `youtube_video_id`, `stage`.
- Per-run counters and latency.
- Error classification: `quota`, `network`, `parse`, `llm_schema`, `db_conflict`.

Failure policy:
- Partial success is acceptable.
- Continue processing next tool/video on item-level failures.
- Do not fail entire run unless DB unavailable.

## 12) Rollout Plan (Implementation Sequence)
1. Add/confirm DB constraints + additive status columns.
2. Build `pipeline-discover-youtube`.
3. Build `pipeline-extract-deals` (regex only first, LLM second).
4. Build `pipeline-extract-reviews` with transcript + LLM JSON mode.
5. Add dedup + maintenance function.
6. Run first batch manually, perform QA, then enable weekly cron.

Acceptance criteria:
- Re-running functions is idempotent.
- No duplicate videos/mentions/snippets under defined keys.
- At least 80-90% of selected videos process without hard failure.
- Deals and snippets show valid receipt URLs in UI.

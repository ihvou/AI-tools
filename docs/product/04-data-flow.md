# AI Video Ads Hub — Data Flow (Production Snapshot + Implementation Guide)

This document describes what is currently implemented and used against production data, plus the model testing/refinement process and remaining risks.

## 0) Scope and Operating Model
Current MVP architecture:
- Supabase Edge Functions for scheduled pipeline stages.
- Supabase Postgres as source of truth with idempotent upserts.
- Local operator scripts for backfills and model-quality experiments.

Input source priority:
- manual seed list (primary source for MVP bootstrap)
- tool aggregators / public directories (optional, future enrichment)

## 1) Current Production Flow (Implemented)
### 1.1 Tool Seeding
- Tools are manually curated in `tools` and `tool_categories`.
- No automated tool discovery is running in production.

### 1.2 Video Discovery (`pipeline-discover-youtube`)
Implemented behavior:
1. For each scoped tool, run YouTube searches:
   - `<tool> review`
   - `<tool> tutorial`
2. Fetch details via `videos.list`.
3. Reject videos that do not mention the tool in title or description.
4. Upsert:
   - `youtube_channels` by `youtube_channel_id`
   - `youtube_videos` by `youtube_video_id`
   - `video_mentions` by `(tool_id, video_id, first_mentioned_second)` (currently `first_mentioned_second=0`).

Notes:
- Discovery is idempotent on repeated runs.
- This stage does not fetch transcripts.

### 1.3 Deal Extraction (`pipeline-extract-deals`)
Implemented behavior:
1. Select scoped videos where `deals_parsed_at IS NULL`.
2. Parse only `youtube_videos.description` with deterministic rules in `supabase/functions/_shared/deals.ts`.
3. Extract:
   - `offer_text`
   - `offer_type` (`Code|Link|Trial extension|Credit bonus|Unknown`)
   - `code` (optional)
   - `link_url` (optional)
4. Hard filters:
   - reject generic free-trial CTA language (standard free tier/trial is not a deal)
   - reject link-only non-deal social/community/course links
   - require offer detail signal (`code` or strong offer pattern)
5. Dedupe/upsert:
   - code deals: same `tool + code`
   - link deals: same `tool + link_url`
   - fallback text match: same `tool + fuzzy offer_text`
6. Persist to `deals` with `source='description'`.
7. Mark `youtube_videos.deals_parsed_at`.

Important:
- LLM is not used in production deal extraction at the moment.
- Transcript-based deal enrichment is currently a script/test path, not the deployed edge-function path.

### 1.4 Transcript Cache + Review Extraction (`pipeline-extract-reviews`)
Implemented behavior:
1. Select scoped videos (default: `processed_at IS NULL`; supports reprocess flags when deployed with latest code).
2. Load transcript cache from `video_transcripts` by `video_id`.
3. If cache miss and `cache_only=false`, fetch timedtext transcript and upsert cache:
   - `video_transcripts.video_id` unique
   - stores both full text and `segments_json`
4. If transcript missing:
   - mark `transcript_status='missing'` (or `failed` on errors)
   - continue without stopping the batch
5. Build review windows:
   - primary: tool-mention windows from transcript aliases
   - fallback: one high-signal decision window if no mention window found
6. LLM extraction (`supabase/functions/_shared/openai.ts`):
   - model from `PIPELINE_REVIEW_MODEL` (default currently `gpt-4.1-mini`)
   - strict JSON schema output
   - verbatim-only quote
   - filters for hype/planning/generic filler
   - competitor leakage guard
   - minimum signal checks (topic + claim verb + length)
7. Dedupe snippets:
   - same `tool_id + video_id + timestamp within +/-5s` keeps one row
   - higher confidence replaces lower confidence on collision
8. Persist `review_snippets`, set `youtube_videos.processed_at`, `transcript_status='ok'`.

Fallback behavior:
- If `OPENAI_API_KEY` is absent, heuristic extraction is used.
- Confidence threshold is controlled by `PIPELINE_MIN_CONFIDENCE` (default currently `0.45` in code).

### 1.5 Maintenance (`pipeline-maintenance`)
Implemented behavior:
- Recompute `tools.review_sources_count` and `tools.last_seen_review_date`.
- Mark stale deals inactive based on configured threshold.

## 2) Data Contracts and Idempotency
Core uniqueness:
- `youtube_videos.youtube_video_id` unique.
- `video_transcripts.video_id` unique.
- `video_mentions` logical uniqueness by tool/video with current constraint on `(tool_id, video_id, first_mentioned_second)`.

Operational columns:
- `youtube_videos.processed_at`
- `youtube_videos.transcript_status` (`pending|ok|missing|failed`)
- `youtube_videos.deals_parsed_at`
- `review_snippets.raw_snippet_text`
- `deals.source` (`description|transcript`)

## 3) Scheduling Order (Current)
Recommended run order:
1. `pipeline-discover-youtube`
2. `pipeline-extract-deals`
3. `pipeline-extract-reviews`
4. `pipeline-maintenance`

MVP cadence:
- weekly full refresh is sufficient
- manual one-tool runs are used for QA and tuning

## 4) Model Testing and Refinement Methodology
Model testing is implemented as an explicit offline eval workflow (script path):
- `scripts/review-prompt-tune.mjs`

Methodology used:
1. Build dataset from cached transcripts (`video_transcripts`) for a target tool.
2. Create transcript windows per video (mention windows + fallback windows).
3. Generate a gold set:
   - extraction pass with stronger model (`gpt-4.1`)
   - strict critic pass to drop low-value quotes
4. Run prompt variants (`v1...v7`) against cheap candidate models.
5. Score each output window against gold using:
   - TP/FP/FN/TN
   - precision, recall, F1
   - overlap matching (Jaccard threshold)
6. Keep the best prompt/model pair and port prompt logic to shared extractor (`_shared/openai.ts`).

Benchmark slice used in latest tuning:
- Tool: `invideo-ai`
- 20 videos
- 36 transcript windows
- 16 gold-positive windows

Latest measured results (same prompt family, same dataset):
- `gpt-4.1-mini` + `v5_tool_scope_guard`: `P=0.833`, `R=0.625`, `F1=0.714`
- `gpt-4o-mini` + `v5_tool_scope_guard`: `P=0.700`, `R=0.438`, `F1=0.538`
- `gpt-4.1-nano` + `v5_tool_scope_guard`: `P=0.625`, `R=0.313`, `F1=0.417`

Current practical choice:
- `gpt-4.1-mini` is the best cheap model currently tested for this task.

## 5) Environment Variables
Required:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `YOUTUBE_API_KEY`
- `OPENAI_API_KEY`

Optional tuning:
- `PIPELINE_REVIEW_MODEL` (default `gpt-4.1-mini`)
- `PIPELINE_DEFAULT_VIDEO_LIMIT`
- `PIPELINE_MIN_CONFIDENCE` (default `0.45` in current code)
- `PIPELINE_TRANSCRIPT_TIMEOUT_MS`

## 6) Remaining Concerns (Not Solved Yet)
1. Quote utility is still inconsistent:
- Some accepted quotes are technically valid but weak for decision-making.
- We still need a stricter “customer-value critic” gate in production (not only in tuning workflow).

2. Context boundaries:
- Some quotes are too short/fragmented.
- Some are too long and hide the main point.
- Sentence-boundary aware expansion/compression is still incomplete.

3. Missing “summary + evidence” UX layer:
- UI currently relies on raw quotes.
- We still need short interpreted comments plus expandable verbatim quote blocks.

4. Recall/precision tradeoff:
- Live run recall still lags benchmark expectations in some tools.
- Confidence thresholds and windowing strategy need further calibration per category.

5. Source coverage:
- Pipeline is YouTube-first.
- No production ingestion yet from Trustpilot/G2/Capterra/CNET style review sources.

6. Deployment drift risk:
- There can be temporary mismatch between local tested logic and deployed edge-function version.
- Deploy+verify checklist should be enforced after each tuning change.

7. No source-weighting and trust scoring:
- All review snippets are treated similarly today.
- Need per-source confidence and moderation rules before cross-source aggregation.

## 7) Practical Next-Step Priorities
1. Add production critic layer for decision-value filtering.
2. Add sentence-boundary quote normalization (fix cut-offs and excessive length).
3. Add summary layer (`short_comment`) while preserving full verbatim evidence.
4. Add category-specific criteria scoring for AI video tools.
5. Expand ingestion to additional review sources with legal/compliance checks and provenance controls.

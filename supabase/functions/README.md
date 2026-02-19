# Edge Functions: Data Pipeline

This folder contains the MVP ingestion/processing functions described in `docs/product/04-data-flow.md`.

## Functions

- `pipeline-discover-youtube`
  - Uses YouTube Data API (`search.list` + `videos.list`)
  - Upserts `youtube_channels`, `youtube_videos`, `video_mentions`
  - Rejects videos that do not mention the tool in title or description

- `pipeline-extract-deals`
  - Parses `youtube_videos.description`
  - Extracts and upserts `deals`
  - Updates `youtube_videos.deals_parsed_at`

- `pipeline-extract-reviews`
  - Fetches timedtext transcript segments
  - Caches transcripts in `video_transcripts` and reuses cache on re-runs
  - Extracts claim-like snippets around tool mentions
  - Hard-dedupes by tool + video + timestamp window
  - Updates `youtube_videos.processed_at` and `transcript_status`

- `pipeline-maintenance`
  - Recomputes `tools.review_sources_count` / `last_seen_review_date`
  - Marks stale deals inactive

## Required secrets

Set these in Supabase project secrets before deploy:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `YOUTUBE_API_KEY` (required by discovery)
- `OPENAI_API_KEY` (optional in current implementation)
- Optional tuning:
  - `PIPELINE_REVIEW_MODEL` (default: `gpt-4.1-mini`)
  - `PIPELINE_DEFAULT_VIDEO_LIMIT`
  - `PIPELINE_MIN_CONFIDENCE`
  - `PIPELINE_TRANSCRIPT_TIMEOUT_MS`

## Deploy

```bash
supabase functions deploy pipeline-discover-youtube
supabase functions deploy pipeline-extract-deals
supabase functions deploy pipeline-extract-reviews
supabase functions deploy pipeline-maintenance
```

## Invoke manually

```bash
supabase functions invoke pipeline-discover-youtube --body '{"run_mode":"manual","limit_tools":10,"limit_videos_per_tool":5}'
supabase functions invoke pipeline-extract-deals --body '{"run_mode":"manual"}'
supabase functions invoke pipeline-extract-reviews --body '{"run_mode":"manual","limit_tools":10,"limit_videos_per_tool":3}'
supabase functions invoke pipeline-maintenance --body '{"run_mode":"manual","stale_days":60}'
```

Useful review re-run flags:
- `reprocess_videos=true`: include videos with non-null `processed_at`
- `cache_only=true`: do not fetch transcripts from YouTube; use `video_transcripts` cache only

## Suggested schedule order

1. `pipeline-discover-youtube`
2. `pipeline-extract-deals`
3. `pipeline-extract-reviews`
4. `pipeline-maintenance`

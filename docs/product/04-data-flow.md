# AI Video Ads Hub — Data Flow (Rough)

This is the rough pipeline discussed for populating tools, review snippets, and promo deals using public sources and YouTube evidence.

## 1) Get or update tool catalog
Input sources:
- tool aggregators (API or parsing)
- manual seed list (initial bootstrap, optional)

Steps:
1. Normalize tool identity:
   - canonical name
   - slug
   - official_url
2. Attach categories and pricing tier (only if reliably obtainable).
3. Store in `tools` and `tool_categories`.

Output:
- a clean set of tools with minimal metadata.

## 2) Discover candidate YouTube videos per tool
Inputs:
- tool name + common variants
- category keywords (optional)

Steps:
1. Search YouTube for videos likely to include tool usage or sponsor reads.
2. Collect candidate video IDs with metadata (title, channel, publish date).
3. Store to `youtube_videos` and link to tool via `video_mentions` candidates.

Output:
- candidate pool of videos for each tool.

## 3) Pre-qualify candidate videos
Goal:
- reduce noise and avoid processing irrelevant videos.

Steps (heuristics):
1. Reject videos that do not mention the tool name in title/description/transcript.
2. Prioritize videos with sponsor segments (keywords in description or transcript):
   - “sponsored”, “use code”, “affiliate”, “link in description” etc.
3. Keep “evidence_video_count” and “last_seen_date” signals.

Output:
- curated list of videos worth transcript parsing.

## 4) Fetch and parse transcripts
Inputs:
- qualified video IDs

Steps:
1. Fetch transcript/captions (when available).
2. Chunk transcript into time-coded segments.
3. Store raw transcript (optional) or store segments.

Output:
- time-coded transcript segments for extraction.

## 5) Extract review snippets (tool evidence)
Goal:
- generate short, attributable claims with topics and sentiment.

Steps:
1. Identify transcript segments around tool mentions.
2. Extract a short snippet (quote_text).
3. Classify sentiment:
   - Pro / Con / Neutral
4. Tag topics:
   - UI/UX (user interface/user experience), Output quality, Pricing, Speed, Limits, Reliability, Support, Cancellation, etc.
5. Generate receipt link:
   - YouTube URL with timestamp (receipt_timestamp_label like “5:42”).

Output (store):
- `review_snippets` with: tool_id, video_id, quote_text, sentiment, topics, channel, date, receipt_url.

## 6) Extract deals / promo codes
Goal:
- detect sponsor-read deal mentions in description or transcript.

Steps:
1. Parse video description for:
   - “use code XYZ”, “promo code”, “discount”, “% off”, “free trial”, etc.
2. Parse transcript for similar patterns.
3. Extract:
   - offer_text
   - code (optional)
   - receipt timestamp (when mentioned)
4. Generate receipt link at correct timestamp.

Output (store):
- `deals` with: tool_id, offer_text, code, last_seen_date, receipt_url, receipt_timestamp_label.

## 7) Refine + dedupe
Goal:
- keep the UI clean and reliable.

Steps:
1. Dedupe review snippets:
   - same tool + same video + very similar text
2. Dedupe deals:
   - same code + same tool + same offer text
3. Refresh “last seen” fields based on newest supporting video.
4. Maintain counts:
   - evidence_video_count per tool
   - deals_count per tool
   - category counts (tools and deals)

## 8) Publish and feedback loop
1. Frontend reads lists and detail pages from Supabase.
2. Users click “Report” on reviews/deals.
3. Reports are stored and used to:
   - suppress bad entries
   - re-check receipts
   - improve extraction heuristics

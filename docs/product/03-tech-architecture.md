# AI Video Ads Hub — Tech Architecture

## High-level stack (as discussed)
- Frontend: **Next.js (Next.js framework)** or **React (React library)**.
  - Recommendation: Next.js for routing + Search engine optimization (SEO) category pages.
- Backend: **Supabase** (PostgreSQL database + APIs).
- Data processing: **Supabase Edge Functions** (TypeScript) for ingestion and extraction pipelines.

## Suggested deployment shape
- Next.js app deployed on a modern hosting provider (e.g., Vercel, Cloudflare Pages) with environment variables for Supabase.
- Supabase provides:
  - PostgreSQL tables
  - Row Level Security (RLS) policies if needed
  - REST and GraphQL (optional) access
  - Edge Functions for ingestion and scheduled processing

## Core backend responsibilities
1) Serve lists and detail pages for:
   - tools
   - deals
   - review snippets
   - categories
2) Handle “Report” submissions:
   - store reports
   - basic dedupe + spam throttling (optional)
3) Ingestion + processing pipeline:
   - fetch tool metadata from aggregators (where available)
   - discover relevant YouTube videos
   - fetch transcripts / captions
   - extract review snippets and deals
   - normalize + store

## Data sources
### Tool metadata
- Tool directories/aggregators (API or parsing public pages).
- Only keep fields we can obtain reliably (name, categories, pricing tier, platforms, official URL, logo URL).

### YouTube evidence and deals
- YouTube video metadata:
  - title, channel, publish date
- Description text (often contains sponsor codes/links)
- Transcript / captions (used to extract mention snippets and deal mentions)
- Receipts are YouTube links with timestamps.

## Database entities (recommended)
- tools
- categories
- tool_categories (join table)
- youtube_channels
- youtube_videos
- video_mentions (tool_id + video_id + derived fields)
- review_snippets (tool_id + video_id + sentiment + topics + quote + receipt timestamp/link)
- deals (tool_id + video_id + offer + code + last_seen + receipt timestamp/link)
- reports (type=review/deal, entity_id, issue_type, notes, created_at)

## API surface (Supabase)
- Read:
  - /tools (filters: search, category, has_deals, sort)
  - /deals (filters: tool search, category, optional offer-size, sort)
  - /tools/:slug (tool metadata)
  - /tools/:slug/reviews (filters: sentiment, topics, text search, sort)
  - /tools/:slug/deals (sort)
  - /categories (counts tools/deals)
- Write:
  - /reports (create report entries)

## Frontend architecture
### Next.js approach (recommended)
- Pages/routes:
  - / (home)
  - /tools
  - /tools/category/[slug]
  - /deals
  - /deals/category/[slug]
  - /tool/[slug] with tabs (?tab=reviews|deals)
  - /methodology, /contact, /privacy, /terms (static)
- Data fetching:
  - server-side rendering for SEO category pages (tools/deals by category)
  - client-side filtering interactions for tables (or hybrid)
- Component system:
  - Table (desktop) + List (mobile) views using shared data hooks

### React approach
- React + router can work, but you’ll need extra work for SEO category pages (pre-rendering or static generation).

## Edge Functions architecture (processing)
- Functions are responsible for:
  - ingestion (pull from sources)
  - extraction (parse transcripts/description)
  - normalization (topics, sentiment)
  - upsert into DB
  - dedupe
- Scheduling:
  - Use cron/scheduled triggers to refresh “last seen” and discover new videos (frequency depends on quota and cost).

## Non-functional considerations
- Rate limits and quotas (YouTube APIs, transcript fetching).
- Idempotency:
  - pipeline must be safe to re-run (upserts, dedupe by video_id + tool_id + timestamp).
- Observability:
  - structured logs per function
  - basic monitoring for failures
- Data quality:
  - store raw transcript segments and extraction confidence if feasible (optional for MVP).

# AI Tools — Tech Architecture

## High-level stack
- Frontend: **Next.js 14** (App Router) with **TypeScript**.
- Styling: **Tailwind CSS** (utility-first).
- UI primitives: **Radix UI** (accessible tabs component).
- Icons: **Lucide React**.
- Images: **Next.js Image** component with external URLs.
- Backend: **Supabase** (PostgreSQL database + REST API).
- Data processing (future): **Supabase Edge Functions** (TypeScript) for ingestion and extraction pipelines.

## Current deployment
- Next.js app deployed on **Vercel** at `ai-tools-gold.vercel.app`.
- GitHub repo: `ihvou/AI-tools`.
- Supabase project provides PostgreSQL database.
- Fallback: static mock data in `lib/data/mockData.ts` is used when Supabase env vars are not configured.

## Production deployment shape
- Next.js app deployed on Vercel with environment variables for Supabase.
- Supabase provides:
  - PostgreSQL tables (normalized schema)
  - Row Level Security (RLS) policies
  - REST API (PostgREST) for reads and writes
  - RPC functions for aggregations and joins
  - Edge Functions for ingestion and scheduled processing (future)

## Core backend responsibilities
1) Serve lists and detail pages for:
   - tools
   - deals
   - review snippets
   - categories
2) Handle "Report" submissions:
   - store reports
   - basic dedupe + spam throttling (optional)
3) Ingestion + processing pipeline (future):
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

---

## Database structure (Supabase / PostgreSQL)

The schema uses a **normalized relational design** with junction tables (not PG arrays for relationships). All migrations are in `supabase/migrations/`.

### Tables overview

| Table | Purpose |
|-------|---------|
| `tools` | AI tool records (slug, name, logo, pricing, etc.) |
| `categories` | Category names and slugs (normalized, not enum) |
| `tool_categories` | Junction table: tool <-> category (many-to-many) |
| `youtube_channels` | YouTube channel metadata |
| `youtube_videos` | YouTube video metadata |
| `video_mentions` | Junction: which videos mention which tools |
| `review_snippets` | Review quotes extracted from videos |
| `deals` | Promo deals extracted from videos |
| `reports` | User-submitted flags (review/deal issues) |

### Core tables (DDL)

```sql
-- ════════════════════════════════════════════
-- tools
-- ════════════════════════════════════════════
create table tools (
  id                    uuid primary key default gen_random_uuid(),
  slug                  text not null unique,      -- URL-safe ID, e.g. 'opus-clip'
  name                  text not null,
  short_tagline         text not null,
  logo_url              text not null,
  website_url           text not null,
  registration_url      text,                      -- nullable
  pricing_model         text not null check (pricing_model in
                          ('Free', 'Free trial', 'Paid', 'Freemium', 'Unknown')),
  platforms             text[] not null default '{}',
  review_sources_count  integer not null default 0 check (review_sources_count >= 0),
  last_seen_review_date date,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
-- Auto-update updated_at via trigger: trg_tools_updated_at

-- ════════════════════════════════════════════
-- categories
-- ════════════════════════════════════════════
create table categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  slug       text not null unique,
  created_at timestamptz not null default now()
);

-- Seeded values:
-- Repurposing, UGC Avatars, Captions, Scripts/Hooks, Video Gen/B-roll, Dubbing/Voice

-- ════════════════════════════════════════════
-- tool_categories (junction)
-- ════════════════════════════════════════════
create table tool_categories (
  tool_id     uuid not null references tools(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (tool_id, category_id)
);

-- ════════════════════════════════════════════
-- review_snippets
-- ════════════════════════════════════════════
create table review_snippets (
  id                        uuid primary key default gen_random_uuid(),
  tool_id                   uuid not null references tools(id) on delete cascade,
  video_id                  uuid not null references youtube_videos(id) on delete cascade,
  sentiment                 text not null check (sentiment in ('Pro', 'Con', 'Neutral')),
  tags                      text[] not null default '{}',
  snippet_text              text not null,
  video_title               text not null default '',
  channel_name              text,
  publish_date              date,
  receipt_timestamp_seconds integer not null check (receipt_timestamp_seconds >= 0),
  receipt_url               text not null,
  sponsored_flag            boolean default false,
  extraction_confidence     numeric(4,3),
  created_at                timestamptz not null default now()
);

-- ════════════════════════════════════════════
-- deals
-- ════════════════════════════════════════════
create table deals (
  id                        uuid primary key default gen_random_uuid(),
  tool_id                   uuid not null references tools(id) on delete cascade,
  video_id                  uuid references youtube_videos(id) on delete set null,
  offer_text                text not null,
  offer_type                text check (offer_type in
                              ('Code', 'Link', 'Trial extension', 'Credit bonus', 'Unknown')),
  code                      text,                  -- promo code (nullable)
  link_url                  text,                  -- direct deal link (nullable)
  category                  text[] not null default '{}',  -- category names for filtering
  receipt_timestamp_seconds integer check (receipt_timestamp_seconds >= 0),
  receipt_url               text not null,
  active                    boolean not null default true,
  last_seen                 timestamptz not null default now(),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);
-- Auto-update updated_at via trigger: trg_deals_updated_at

-- ════════════════════════════════════════════
-- reports (user-submitted flags)
-- ════════════════════════════════════════════
create table reports (
  id                   uuid primary key default gen_random_uuid(),
  report_type          text not null check (report_type in ('review', 'deal')),
  entity_id            uuid not null,
  issue_type           text not null,
  notes                text,
  reporter_fingerprint text,
  status               text not null default 'open'
                         check (status in ('open', 'triaged', 'resolved', 'dismissed')),
  created_at           timestamptz not null default now()
);
```

### Pipeline tables (used by ingestion, not directly by UI)

```sql
create table youtube_channels (
  id                 uuid primary key default gen_random_uuid(),
  youtube_channel_id text unique,
  name               text not null,
  handle             text,
  channel_url        text,
  created_at         timestamptz not null default now()
);

create table youtube_videos (
  id               uuid primary key default gen_random_uuid(),
  youtube_video_id text not null unique,
  channel_id       uuid references youtube_channels(id) on delete set null,
  title            text not null,
  description      text,
  video_url        text,
  published_at     timestamptz,
  created_at       timestamptz not null default now()
);

create table video_mentions (
  id                      uuid primary key default gen_random_uuid(),
  tool_id                 uuid not null references tools(id) on delete cascade,
  video_id                uuid not null references youtube_videos(id) on delete cascade,
  mention_count           integer not null default 1 check (mention_count > 0),
  first_mentioned_second  integer,
  last_mentioned_second   integer,
  extraction_confidence   numeric(4,3),
  created_at              timestamptz not null default now(),
  unique (tool_id, video_id, first_mentioned_second)
);
```

### Indexes

```sql
create index idx_tools_name on tools(name);
create index idx_tools_pricing_model on tools(pricing_model);
create index idx_tool_categories_category_id on tool_categories(category_id);
create index idx_youtube_videos_channel_id on youtube_videos(channel_id);
create index idx_youtube_videos_published_at on youtube_videos(published_at desc);
create index idx_video_mentions_tool_id on video_mentions(tool_id);
create index idx_video_mentions_video_id on video_mentions(video_id);
create index idx_review_snippets_tool_id on review_snippets(tool_id);
create index idx_review_snippets_sentiment on review_snippets(sentiment);
create index idx_review_snippets_publish_date on review_snippets(publish_date desc);
create index idx_deals_tool_id on deals(tool_id);
create index idx_deals_active_last_seen on deals(active, last_seen desc);
create index idx_reports_created_at on reports(created_at desc);
create index idx_reports_type_entity on reports(report_type, entity_id);
```

### Row Level Security (RLS)

All tables are **public-read**. Only the `reports` table accepts anonymous inserts.

```sql
-- All tables: public read-only (select policy using (true))
-- reports: additionally allows insert for anon + authenticated roles
create policy "Anyone can submit" on reports for insert
  to anon, authenticated with check (true);
```

### Migrations

All schema changes are tracked in `supabase/migrations/`:

| Migration | Purpose |
|-----------|---------|
| `20260217230000_init_ai_tools_schema.sql` | Core normalized schema (9 tables), indexes, RLS |
| `20260218033000_align_schema_with_frontend_types.sql` | Column alignment, RPC functions, seed categories |
| `20260218150000_seed_expanded_realistic_sample_data.sql` | 16 tools, 18 deals, 24 reviews |
| `20260218153000_seed_additional_reviews_coverage.sql` | Additional review coverage |
| `20260218162000_fix_and_enrich_sample_data.sql` | Data enrichment |
| `20260218170000_fix_remaining_rpc_rls_and_reviews.sql` | Additional RPCs and RLS fixes |

---

## API surface

### Server-side data layer: `lib/server/backendData.ts`

This is the **central data access layer** for the application. It provides:

1. **`getAppData()`** — Main export, wrapped in React `cache()` for request deduplication. Returns `{ tools, deals, reviews, categories }`.
   - If Supabase env vars are configured: fetches from Supabase REST API
   - If not configured or on error: falls back to mock data from `lib/data/mockData.ts`

2. **`createReport(input)`** — Inserts a report row via Supabase REST POST.

3. **`getCategoryCounts()`** — Calls RPC `get_category_counts`.

4. **`searchAll(query)`** — Calls RPC `search_all`.

5. **`getCategorySlug(category)`** / **`getCategoryFromSlug(slug, categories)`** — Pure string utilities.

#### How it talks to Supabase

Uses **native `fetch()`** to Supabase REST API (PostgREST). Does NOT use `supabase-js` client library.

```typescript
// Pattern for reads:
async function restGet<T>(pathWithQuery: string, useService = false): Promise<T> {
  const response = await fetch(`${url}/rest/v1/${pathWithQuery}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });
  return response.json() as Promise<T>;
}

// Pattern for RPCs:
async function rpcCall<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: service, Authorization: `Bearer ${service}`, ... },
    body: JSON.stringify(body),
  });
  return response.json() as Promise<T>;
}
```

#### Data mapping

The `backendData.ts` file maps Supabase row shapes to frontend TypeScript types:

| DB Row Type | Maps To | Key transforms |
|-------------|---------|---------------|
| `ToolRow` (with nested `tool_categories`) | `Tool` | `row.id` -> internal ID; `row.slug` -> `tool_id`; categories extracted from junction join |
| `DealRow` | `Deal` | `receipt_timestamp_seconds` -> `timestamp` string (e.g., "5:42"); `last_seen` -> `last_seen_date` (date only) |
| `ReviewRow` | `ReviewEvidence` | `receipt_timestamp_seconds` -> `timestamp` string; tags validated against known values |

**Important**: The frontend uses `tool.tool_id` which maps to the DB `tools.slug` field (not the UUID `tools.id`). The UUID is only used for internal DB references.

#### REST queries used by `loadFromSupabase()`

```
-- Tools (with categories via junction table):
tools?select=id,slug,name,logo_url,website_url,registration_url,short_tagline,
  pricing_model,platforms,review_sources_count,last_seen_review_date,
  tool_categories(categories(name))&order=name.asc

-- Deals:
deals?select=id,tool_id,offer_text,offer_type,code,link_url,last_seen,
  receipt_url,receipt_timestamp_seconds,category&order=last_seen.desc

-- Reviews:
review_snippets?select=id,tool_id,video_id,channel_name,video_title,publish_date,
  sentiment,tags,snippet_text,receipt_url,receipt_timestamp_seconds,
  sponsored_flag&order=publish_date.desc
```

### Supabase RPC functions

```sql
-- Category counts (homepage + category nav)
create or replace function get_category_counts()
returns table (category_id uuid, name text, slug text, tool_count bigint, deal_count bigint)
language sql stable;

-- Tool detail with counts (optimization)
create or replace function get_tool_detail(p_slug text)
returns json language sql stable;

-- Full-text search across tools + deals
create or replace function search_all(q text)
returns json language sql stable;
```

### Next.js API routes

These are thin wrappers around `lib/server/backendData.ts` functions, providing HTTP endpoints for client components.

| Route | Method | Purpose | Handler |
|-------|--------|---------|---------|
| `/api/frontend-data` | GET | Returns all app data (`{ tools, deals, reviews, categories }`) | Calls `getAppData()` |
| `/api/reports` | POST | Submit a report | Calls `createReport()`. Body: `{ reportType, entityId, issueType, notes? }` |
| `/api/search` | GET | Search tools + deals | Calls `searchAll(q)`. Query param: `?q=<term>` |
| `/api/category-counts` | GET | Get category counts | Calls `getCategoryCounts()` |

### Environment variables

Required for Supabase integration (`.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

If these are not set, the app falls back to mock data automatically.

---

## Frontend architecture

### Next.js App Router structure

```
app/
├── layout.tsx                  # Root layout (Header + Footer + metadata)
├── page.tsx                    # Home page (SSR, server component)
├── globals.css                 # Global Tailwind styles + .pb-safe utility
├── tools/
│   └── [[...category]]/
│       └── page.tsx            # All Tools + Category Tools (client component)
├── deals/
│   └── [[...category]]/
│       └── page.tsx            # All Deals + Category Deals (client component)
├── tool/
│   └── [id]/
│       └── page.tsx            # Tool Detail (SSR shell + client tabs)
├── methodology/
│   └── page.tsx                # Static methodology page
└── api/
    ├── frontend-data/
    │   └── route.ts            # GET: all app data
    ├── reports/
    │   └── route.ts            # POST: submit report
    ├── search/
    │   └── route.ts            # GET: search tools+deals
    └── category-counts/
        └── route.ts            # GET: category counts
```

### Rendering strategy

| Page | Rendering | Data source |
|------|-----------|-------------|
| Home `/` | Server Component (SSR) | `getAppData()` directly |
| Tools `/tools/[[...category]]` | Client Component (`'use client'`) | `fetch('/api/frontend-data')` via `useEffect` |
| Deals `/deals/[[...category]]` | Client Component (`'use client'`) | `fetch('/api/frontend-data')` via `useEffect` |
| Tool Detail `/tool/[id]` | Server Component shell + Client tabs | `getAppData()` for shell; `ToolDetailTabs` is client |
| Methodology `/methodology` | Static/Server Component | No data fetching |

### Category routing pattern

Both `/tools` and `/deals` use Next.js **optional catch-all routes** `[[...category]]`:
- `/tools` -> `params.category` is `undefined`
- `/tools/repurposing` -> `params.category` is `['repurposing']`
- Category dropdown changes trigger `router.push('/tools/<slug>')` or `router.push('/tools')` for "All"
- Category slug format: `category.toLowerCase().replace(/\//g, '-').replace(/\s+/g, '-')`
- `getCategoryFromSlug()` maps slug back to display name

### Component system

```
components/
├── ui/
│   ├── Container.tsx           # Global width container (max-w-6xl mx-auto px-6)
│   ├── Button.tsx              # Primary/secondary/ghost, 3 sizes, rounded
│   ├── Badge.tsx               # neutral/blue/pro/con variants, sm/md sizes, rounded
│   └── Tabs.tsx                # Radix UI accessible tabs wrapper
└── features/
    ├── Header.tsx              # Sticky header, desktop nav + mobile hamburger
    ├── Footer.tsx              # 3-column footer with helper text
    ├── ReviewsSection.tsx      # Client: sentiment/tag/channel/search/sort filtering
    ├── DealsTable.tsx          # Client: deals table for tool detail, copy code, Claim Deal hover, mobile ellipsis+bottom sheet
    ├── DealsPreviewTable.tsx   # Client: deals preview table for home page, mobile ellipsis+bottom sheet
    ├── DealBottomSheet.tsx     # Client: mobile slide-up panel for deal details
    └── ToolDetailTabs.tsx      # Client: Radix tabs wrapper reading ?tab= search param
```

### Data layer

```
lib/
├── server/
│   └── backendData.ts          # Server-only data layer (Supabase REST + mock fallback)
├── data/
│   └── mockData.ts             # Static mock data (fallback when Supabase not configured)
├── types/
│   └── index.ts                # TypeScript interfaces (Tool, Deal, ReviewEvidence, etc.)
└── utils.ts                    # cn() utility (clsx + twMerge)
```

### Data flow patterns

**Server components** (Home page, Tool Detail shell):
```
getAppData() -> Supabase REST -> map rows -> return { tools, deals, reviews, categories }
     └── Falls back to mock data if Supabase not configured
```

**Client components** (Tools list, Deals list):
```
useEffect -> fetch('/api/frontend-data') -> API route -> getAppData() -> response
     └── useState for tools/deals/categories
     └── isLoading state for loading indicator
```

**Tool Detail tabs** (client within server shell):
```
Server shell: getAppData() -> filter reviews/deals for tool -> pass as props
ToolDetailTabs: useSearchParams() reads ?tab=deals -> sets defaultValue on Tabs
     └── Wrapped in <Suspense> boundary
```

### Key implementation patterns

**Client-side filtering (Tools/Deals list pages):**
- `useMemo` for filtered/sorted results reacting to state changes
- `useState` for search query, selected filters, sort field/direction
- Category dropdown uses `useRouter().push()` to update URL

**"Has deals" filter (Tools page only):**
- `hasDealsOnly` boolean state
- Custom checkbox UI (styled blue square with CheckIcon)
- Filters: `tools.filter(tool => dealsByToolId.get(tool.tool_id) > 0)`

**Claim Deal hover (no layout shift):**
- Fixed-width cell (`w-[100px]`) + fixed inner container (`w-[88px] h-8`)
- Absolute positioning for both default icon and hover button
- `opacity` transition (NOT `display` toggle) prevents table width changes
- Uses Tailwind `group/row` and `group-hover/row:opacity-*` for row-level hover
- Mobile: just shows the ExternalLink icon (no hover transition)

**Copy Code:**
- `navigator.clipboard.writeText(code)` on badge click
- `useState` tracks which deal was just copied
- `setTimeout` clears the "copied" state after 2 seconds
- Visual: Copy icon -> Check icon transition

**Mobile bottom sheet (DealBottomSheet):**
- `useState` for visibility animation state
- `requestAnimationFrame` to trigger slide-up after mount
- `document.body.style.overflow = 'hidden'` to lock body scroll
- CSS: `translate-y-full -> translate-y-0` with `transition-transform duration-200 ease-out`
- Close: reverse animation, unmount after 200ms via `setTimeout`
- Safe area: `.pb-safe { padding-bottom: env(safe-area-inset-bottom, 16px); }`

**Review filtering (ReviewsSection):**
- Sentiment: segmented pill buttons (active = blue-600, inactive = gray-100)
- Tag/Channel: `<select>` dropdowns populated from review data
- Search: text input filtering snippet text, channel, and tags
- Sort: Most recent / Oldest by publish date

---

## TypeScript types (key interfaces)

> Source of truth: `lib/types/index.ts`

```typescript
// ── Enum / union types ──────────────────────────
type PricingModel = 'Free' | 'Free trial' | 'Paid' | 'Freemium' | 'Unknown';
type Platform     = 'Web' | 'iOS' | 'Android' | 'Desktop' | 'API' | 'Unknown';
type Category     = 'Repurposing' | 'UGC Avatars' | 'Captions'
                  | 'Scripts/Hooks' | 'Video Gen/B-roll' | 'Dubbing/Voice';
type Sentiment    = 'Pro' | 'Con' | 'Neutral';
type ReviewTag    = 'UI/UX' | 'Output quality' | 'Relevance' | 'Speed'
                  | 'Pricing' | 'Cancellation/Refund' | 'Limits'
                  | 'Integrations' | 'Watermark' | 'Export quality'
                  | 'Support' | 'Reliability' | 'Other';
type OfferType    = 'Code' | 'Link' | 'Trial extension' | 'Credit bonus' | 'Unknown';

// ── Interfaces ──────────────────────────────────
interface Tool {
  tool_id: string;           // maps to DB tools.slug
  name: string;
  logo_url: string;
  website_url: string;
  registration_url?: string;
  short_tagline: string;
  categories: Category[];
  pricing_model: PricingModel;
  platforms?: Platform[];
  review_sources_count?: number;
  last_seen_review_date?: string;
}

interface ReviewEvidence {
  review_id: string;         // maps to DB review_snippets.id
  tool_id: string;           // maps to DB tools.slug (resolved via junction)
  video_id: string;
  channel_name: string;
  video_title: string;
  publish_date: string;
  sentiment: Sentiment;
  tags: ReviewTag[];
  snippet_text: string;
  receipt_url: string;
  timestamp: string;         // derived: "M:SS" from receipt_timestamp_seconds
  sponsored_flag?: boolean;
}

interface Deal {
  deal_id: string;           // maps to DB deals.id
  tool_id: string;           // maps to DB tools.slug (resolved via junction)
  offer_text: string;
  offer_type: OfferType;
  code?: string;
  link_url?: string;
  last_seen_date: string;    // derived: first 10 chars of deals.last_seen
  receipt_url: string;
  timestamp: string;         // derived: "M:SS" from receipt_timestamp_seconds
  category: Category[];
}

interface CategoryInfo {
  slug: string;
  name: Category;
  tools_count: number;
  deals_count: number;
}
```

## Edge Functions architecture (processing — future)
- Functions are responsible for:
  - ingestion (pull from sources)
  - extraction (parse transcripts/description)
  - normalization (topics, sentiment)
  - upsert into DB
  - dedupe
- Scheduling:
  - Use cron/scheduled triggers to refresh "last seen" and discover new videos (frequency depends on quota and cost).

## Non-functional considerations
- Rate limits and quotas (YouTube APIs, transcript fetching).
- Idempotency:
  - pipeline must be safe to re-run (upserts, dedupe by video_id + tool_id + timestamp).
- Observability:
  - structured logs per function
  - basic monitoring for failures
- Data quality:
  - store raw transcript segments and extraction confidence if feasible (optional for MVP).
- External images:
  - `next.config.ts` must whitelist external image domains in `remotePatterns`.

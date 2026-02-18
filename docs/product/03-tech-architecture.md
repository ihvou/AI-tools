# AI Tools — Tech Architecture

## High-level stack (as discussed)
- Frontend: **Next.js 14** (App Router) with **TypeScript**.
- Styling: **Tailwind CSS** (utility-first).
- UI primitives: **Radix UI** (accessible tabs component).
- Icons: **Lucide React**.
- Images: **Next.js Image** component with external Unsplash URLs.
- Backend (future): **Supabase** (PostgreSQL database + APIs).
- Data processing (future): **Supabase Edge Functions** (TypeScript) for ingestion and extraction pipelines.

## Current deployment
- Next.js app deployed on **Vercel** at `ai-tools-gold.vercel.app`.
- GitHub repo: `ihvou/AI-tools`.
- Data: static mock data in `lib/data/mockData.ts` (to be replaced with Supabase in production).

## Suggested production deployment shape
- Next.js app deployed on Vercel with environment variables for Supabase.
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
2) Handle "Report" submissions:
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
- Logo images: currently Unsplash URLs; to be replaced with tool-specific logos.

### YouTube evidence and deals
- YouTube video metadata:
  - title, channel, publish date
- Description text (often contains sponsor codes/links)
- Transcript / captions (used to extract mention snippets and deal mentions)
- Receipts are YouTube links with timestamps.

## Database structure (Supabase / PostgreSQL)

Supabase project: `pkpxbdtxpdilwuhjngzw`

The DB uses **UUID primary keys**, **normalized join tables** for many-to-many relationships (instead of PG arrays), and **CHECK constraints** on text columns (instead of PG enum types). Supabase auto-generates a REST API (PostgREST) for every table.

### Architectural decisions

| Decision | Choice | Rationale |
|---|---|---|
| Primary keys | `uuid` (auto-generated) + `slug` text column with unique constraint on `tools` | UUIDs are safer for distributed inserts (pipeline + manual). The `slug` column is used for URL routing. |
| Categories | Normalized: `categories` table + `tool_categories` join table | More flexible than PG arrays — categories can have metadata (slug, counts), and adding/renaming categories is a single row update. |
| Value constraints | `text` columns + `CHECK` constraints (not PG `enum` types) | PG enums are hard to alter in production (can't remove values, adding requires DDL). CHECK constraints are easier to evolve. |
| Table naming | `review_snippets` (not `review_evidence` from TS types) | DB uses domain-accurate name. The data service layer maps it to the frontend's `ReviewEvidence` interface. |
| Reviews ↔ Videos | `review_snippets.video_id` is a FK → `youtube_videos.id` | Proper relational link enables pipeline-side joins. The frontend doesn't query `youtube_videos` directly — `channel_name`, `video_title`, `publish_date` are denormalized onto `review_snippets` for read performance. |

### Value constraints reference

These are the allowed values for CHECK-constrained columns. They must match the TypeScript union types in `lib/types/index.ts` exactly.

| Column | Allowed values |
|---|---|
| `tools.pricing_model` | `'Free'`, `'Free trial'`, `'Paid'`, `'Freemium'`, `'Unknown'` |
| `review_snippets.sentiment` | `'Pro'`, `'Con'`, `'Neutral'` |
| `deals.offer_type` | `'Code'`, `'Link'`, `'Trial extension'`, `'Credit bonus'`, `'Unknown'` |
| `deals.offer_size` | `'Small'`, `'Medium'`, `'Large'`, `'Unknown'` |
| `reports.report_type` | `'review'`, `'deal'` |

Tags are stored as `text[]` (not enum-constrained) in `review_snippets.tags`. The frontend defines the allowed set in TS:
`'UI/UX' | 'Output quality' | 'Relevance' | 'Speed' | 'Pricing' | 'Cancellation/Refund' | 'Limits' | 'Integrations' | 'Watermark' | 'Export quality' | 'Support' | 'Reliability' | 'Other'`

Platforms are stored as `text[]` in `tools.platforms`. Frontend allowed set:
`'Web' | 'iOS' | 'Android' | 'Desktop' | 'API' | 'Unknown'`

### Core tables (UI-facing)

```sql
-- ════════════════════════════════════════════
-- tools
-- ════════════════════════════════════════════
create table tools (
  id                    uuid primary key default gen_random_uuid(),
  slug                  text not null unique,          -- URL-safe identifier, e.g. 'opus-clip'
  name                  text not null,
  logo_url              text not null,
  website_url           text not null,                 -- official site (maps to TS website_url)
  registration_url      text,                          -- nullable, sign-up link
  short_tagline         text not null,
  pricing_model         text not null check (pricing_model in
                          ('Free','Free trial','Paid','Freemium','Unknown')),
  platforms             text[] not null default '{}',  -- e.g. {'Web','iOS','Desktop'}
  review_sources_count  integer not null default 0,
  last_seen_review_date date,                          -- nullable, most recent review date
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

-- ════════════════════════════════════════════
-- categories
-- ════════════════════════════════════════════
create table categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,                    -- display name, e.g. 'Scripts/Hooks'
  slug        text not null unique,                    -- URL slug, e.g. 'scripts-hooks'
  created_at  timestamptz default now()
);

-- Seed data (must exist before tools can be linked):
-- INSERT INTO categories (name, slug) VALUES
--   ('Repurposing', 'repurposing'),
--   ('UGC Avatars', 'ugc-avatars'),
--   ('Captions', 'captions'),
--   ('Scripts/Hooks', 'scripts-hooks'),
--   ('Video Gen/B-roll', 'video-gen-b-roll'),
--   ('Dubbing/Voice', 'dubbing-voice');

-- ════════════════════════════════════════════
-- tool_categories  (many-to-many join)
-- ════════════════════════════════════════════
create table tool_categories (
  tool_id     uuid not null references tools(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  created_at  timestamptz default now(),
  primary key (tool_id, category_id)
);

-- ════════════════════════════════════════════
-- review_snippets  (maps to TS ReviewEvidence)
-- ════════════════════════════════════════════
create table review_snippets (
  id                         uuid primary key default gen_random_uuid(),
  tool_id                    uuid not null references tools(id) on delete cascade,
  video_id                   uuid not null references youtube_videos(id) on delete cascade,
  channel_name               text not null,             -- denormalized from youtube_channels
  video_title                text not null,             -- denormalized from youtube_videos
  publish_date               date not null,             -- denormalized from youtube_videos
  sentiment                  text not null check (sentiment in ('Pro','Con','Neutral')),
  tags                       text[] not null default '{}', -- e.g. {'UI/UX','Speed','Pricing'}
  snippet_text               text not null,             -- the review quote/snippet
  receipt_url                text not null,             -- YouTube URL with timestamp
  receipt_timestamp_seconds  integer not null,          -- video position in seconds (e.g. 342)
  sponsored_flag             boolean default false,
  extraction_confidence      numeric,                   -- ML confidence score (pipeline use)
  created_at                 timestamptz default now()
);

-- ════════════════════════════════════════════
-- deals
-- ════════════════════════════════════════════
create table deals (
  id                         uuid primary key default gen_random_uuid(),
  tool_id                    uuid not null references tools(id) on delete cascade,
  video_id                   uuid references youtube_videos(id) on delete set null, -- nullable
  offer_text                 text not null,
  offer_type                 text not null check (offer_type in
                               ('Code','Link','Trial extension','Credit bonus','Unknown')),
  code                       text,                      -- promo code (nullable)
  link_url                   text,                      -- direct deal link (nullable)
  receipt_url                text not null,             -- YouTube timestamp proof
  receipt_timestamp_seconds  integer,                   -- video position in seconds
  category                   text[] not null default '{}', -- category names for filtering
  offer_size                 text check (offer_size in ('Small','Medium','Large','Unknown')),
  active                     boolean not null default true, -- soft-delete for expired deals
  last_seen                  timestamptz not null default now(),
  created_at                 timestamptz default now(),
  updated_at                 timestamptz default now()
);

-- ════════════════════════════════════════════
-- reports  (user-submitted flags from the UI)
-- ════════════════════════════════════════════
create table reports (
  id                    uuid primary key default gen_random_uuid(),
  report_type           text not null check (report_type in ('review', 'deal')),
  entity_id             uuid not null,                 -- review_snippets.id or deals.id
  issue_type            text not null,
  notes                 text,
  reporter_fingerprint  text,                          -- browser fingerprint for spam throttling
  status                text not null default 'open',  -- triage workflow: open → resolved
  created_at            timestamptz default now()
);
```

### Pipeline tables (not queried by UI)

```sql
-- ════════════════════════════════════════════
-- youtube_channels
-- ════════════════════════════════════════════
create table youtube_channels (
  id                  uuid primary key default gen_random_uuid(),
  youtube_channel_id  text unique,                     -- YouTube's channel ID
  name                text not null,
  handle              text,                            -- @handle
  channel_url         text,
  created_at          timestamptz default now()
);

-- ════════════════════════════════════════════
-- youtube_videos
-- ════════════════════════════════════════════
create table youtube_videos (
  id                uuid primary key default gen_random_uuid(),
  youtube_video_id  text not null unique,              -- YouTube's video ID (e.g. 'dQw4w9WgXcQ')
  channel_id        uuid references youtube_channels(id) on delete set null,
  title             text not null,
  description       text,
  video_url         text,
  published_at      timestamptz,
  created_at        timestamptz default now()
);

-- ════════════════════════════════════════════
-- video_mentions  (pipeline tracking)
-- ════════════════════════════════════════════
create table video_mentions (
  id                      uuid primary key default gen_random_uuid(),
  tool_id                 uuid not null references tools(id) on delete cascade,
  video_id                uuid not null references youtube_videos(id) on delete cascade,
  mention_count           integer not null default 1,
  first_mentioned_second  integer,
  last_mentioned_second   integer,
  extraction_confidence   numeric,
  created_at              timestamptz default now(),
  unique (tool_id, video_id)
);
```

### Row Level Security (RLS)

All tables have RLS enabled. UI-facing tables are **public-read**. Only `reports` accepts **anonymous inserts**.

```sql
-- All UI-facing tables: public read via anon key
alter table tools enable row level security;
create policy "Public read" on tools for select using (true);

alter table categories enable row level security;
create policy "Public read" on categories for select using (true);

alter table tool_categories enable row level security;
create policy "Public read" on tool_categories for select using (true);

alter table review_snippets enable row level security;
create policy "Public read" on review_snippets for select using (true);

alter table deals enable row level security;
create policy "Public read" on deals for select using (true);

-- reports: anonymous insert + no read (admin reads via service_role)
alter table reports enable row level security;
create policy "Anyone can submit" on reports for insert with check (true);

-- Pipeline tables: public read (useful for debugging, no sensitive data)
alter table youtube_channels enable row level security;
create policy "Public read" on youtube_channels for select using (true);

alter table youtube_videos enable row level security;
create policy "Public read" on youtube_videos for select using (true);
```

### TS → DB field name mapping

The frontend TypeScript interfaces use slightly different names than the DB columns. The **data service layer** (`lib/data/supabase.ts`) handles this mapping so UI components never see DB column names.

| TS interface | TS field | DB table | DB column | Notes |
|---|---|---|---|---|
| `Tool` | `tool_id` | `tools` | `slug` | URL identifier, not the UUID `id` |
| `Tool` | `website_url` | `tools` | `website_url` | — |
| `Tool` | `categories` | `tool_categories` | JOIN → `categories.name` | Resolved via join, returned as `string[]` |
| `Tool` | `last_seen_review_date` | `tools` | `last_seen_review_date` | — |
| `ReviewEvidence` | `review_id` | `review_snippets` | `id` | UUID |
| `ReviewEvidence` | `video_id` | `review_snippets` | `video_id` | FK to `youtube_videos.id` (UUID, not YouTube's video ID) |
| `ReviewEvidence` | `snippet_text` | `review_snippets` | `snippet_text` | — |
| `ReviewEvidence` | `tags` | `review_snippets` | `tags` | `text[]`, not enum-constrained |
| `ReviewEvidence` | `timestamp` | `review_snippets` | `receipt_timestamp_seconds` | Integer seconds in DB → formatted as `"M:SS"` string by service layer |
| `Deal` | `deal_id` | `deals` | `id` | UUID |
| `Deal` | `last_seen_date` | `deals` | `last_seen` | `timestamptz` in DB → `date` string by service layer |
| `Deal` | `timestamp` | `deals` | `receipt_timestamp_seconds` | Same seconds→string conversion as reviews |
| `Deal` | `category` | `deals` | `category` | `text[]` — category names stored directly on deals (denormalized for query simplicity) |
| `Deal` | `offer_size` | `deals` | `offer_size` | — |
| `CategoryInfo` | `tools_count` | — | computed | Via `get_category_counts()` RPC |
| `CategoryInfo` | `deals_count` | — | computed | Via `get_category_counts()` RPC |

---

## API surface (Supabase)

### What Supabase provides out of the box (PostgREST)

Every table gets an auto-generated REST API at `https://<project>.supabase.co/rest/v1/<table>`.
The UI-facing queries below work directly via `supabase-js` with **no custom API routes**.

> **Note:** Because categories use a join table (not arrays on `tools`), category-based filtering requires either PostgREST's nested resource syntax or a custom RPC. The table below shows both approaches.

| Frontend need | PostgREST query (via `supabase-js`) |
|---|---|
| All tools | `supabase.from('tools').select('*')` |
| Tool by slug | `supabase.from('tools').select('*').eq('slug', slug).single()` |
| Tools search | `supabase.from('tools').select('*').or('name.ilike.%q%,short_tagline.ilike.%q%')` |
| Filter by pricing | `supabase.from('tools').select('*').eq('pricing_model', val)` |
| Sort tools | `.order('name' \| 'review_sources_count' \| 'last_seen_review_date', { ascending })` |
| Tool + categories | `supabase.from('tools').select('*, tool_categories(category_id, categories(name, slug))')` |
| Reviews for tool | `supabase.from('review_snippets').select('*').eq('tool_id', toolUuid)` |
| Reviews + filters | `.eq('sentiment', s).contains('tags', [tag]).ilike('channel_name', q)` |
| Deals for tool | `supabase.from('deals').select('*').eq('tool_id', toolUuid).eq('active', true)` |
| Deals search | `.or('offer_text.ilike.%q%,code.ilike.%q%')` |
| Submit report | `supabase.from('reports').insert({ report_type, entity_id, issue_type, notes })` |

### Custom RPCs (not provided out of the box)

These must be created as **Supabase database functions** because they involve aggregations or multi-table joins that PostgREST can't express cleanly.

```sql
-- 1. Category counts (used by homepage + category nav)
--    Returns each category with its tool_count and deal_count.
--    Because categories are a normalized table (not an enum), we query it directly.
create or replace function get_category_counts()
returns table (
  category_id uuid,
  name        text,
  slug        text,
  tool_count  bigint,
  deal_count  bigint
) language sql stable as $$
  select
    c.id,
    c.name,
    c.slug,
    (select count(*) from tool_categories tc where tc.category_id = c.id),
    (select count(*) from deals d
      join tool_categories tc on tc.tool_id = d.tool_id
      where tc.category_id = c.id)
  from categories c
  order by c.name;
$$;
-- Usage: supabase.rpc('get_category_counts')
-- Maps to: CategoryInfo[] in the frontend

-- 2. Tools by category slug
--    Returns all tools belonging to a category, with their full data.
--    Needed because PostgREST can't easily filter the parent via a child join table.
create or replace function get_tools_by_category(p_slug text)
returns setof tools language sql stable as $$
  select t.*
  from tools t
  join tool_categories tc on tc.tool_id = t.id
  join categories c on c.id = tc.category_id
  where c.slug = p_slug;
$$;
-- Usage: supabase.rpc('get_tools_by_category', { p_slug: 'captions' })

-- 3. Deals by category slug
--    Returns all active deals for tools in a given category.
create or replace function get_deals_by_category(p_slug text)
returns setof deals language sql stable as $$
  select d.*
  from deals d
  join tool_categories tc on tc.tool_id = d.tool_id
  join categories c on c.id = tc.category_id
  where c.slug = p_slug
    and d.active = true;
$$;
-- Usage: supabase.rpc('get_deals_by_category', { p_slug: 'captions' })

-- 4. Tool detail with aggregated counts (reduces 3 queries to 1)
create or replace function get_tool_detail(p_slug text)
returns json language sql stable as $$
  select json_build_object(
    'tool',         (select row_to_json(t) from tools t where t.slug = p_slug),
    'review_count', (select count(*) from review_snippets r
                      join tools t on t.id = r.tool_id where t.slug = p_slug),
    'deal_count',   (select count(*) from deals d
                      join tools t on t.id = d.tool_id
                      where t.slug = p_slug and d.active = true),
    'categories',   (select coalesce(json_agg(c.name), '[]'::json)
                      from categories c
                      join tool_categories tc on tc.category_id = c.id
                      join tools t on t.id = tc.tool_id
                      where t.slug = p_slug)
  );
$$;
-- Usage: supabase.rpc('get_tool_detail', { p_slug: 'opus-clip' })

-- 5. Full-text search across tools + deals
create or replace function search_all(q text)
returns json language sql stable as $$
  select json_build_object(
    'tools', (select coalesce(json_agg(t), '[]'::json) from tools t
              where t.name ilike '%' || q || '%'
                 or t.short_tagline ilike '%' || q || '%'),
    'deals', (select coalesce(json_agg(row_to_json(d)), '[]'::json)
              from deals d
              join tools t on t.id = d.tool_id
              where (d.offer_text ilike '%' || q || '%'
                 or d.code ilike '%' || q || '%'
                 or t.name ilike '%' || q || '%')
                and d.active = true)
  );
$$;
-- Usage: supabase.rpc('search_all', { q: 'opus' })
```

### Supabase client setup (Next.js)

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

Required environment variables (`.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### Data service layer (`lib/data/supabase.ts`)

This module replaces `lib/data/mockData.ts`. It wraps all Supabase queries and maps DB rows to the frontend TypeScript interfaces, handling:
- **UUID → slug**: The UI uses `slug` for URLs; the DB uses `uuid` for FKs. This layer resolves `slug` ↔ `uuid` transparently.
- **Column renaming**: e.g. `review_snippets.snippet_text` → `ReviewEvidence.snippet_text` (same), but `deals.last_seen` → `Deal.last_seen_date`.
- **Timestamp formatting**: `receipt_timestamp_seconds` (integer) → `timestamp` (string `"M:SS"`).
- **Category resolution**: JOIN `tool_categories` + `categories` → flat `string[]` on the `Tool` object.
- **Active filtering**: Only return `deals` where `active = true` (expired deals are soft-deleted).

```typescript
// lib/data/supabase.ts — key exports (same interface as mockData.ts)

export async function getTools(): Promise<Tool[]>
export async function getToolBySlug(slug: string): Promise<Tool | null>
export async function getReviewsByToolId(toolUuid: string): Promise<ReviewEvidence[]>
export async function getDealsByToolId(toolUuid: string): Promise<Deal[]>
export async function getToolsByCategory(categorySlug: string): Promise<Tool[]>
export async function getDealsByCategory(categorySlug: string): Promise<Deal[]>
export async function getCategories(): Promise<CategoryInfo[]>
export async function submitReport(report: ReportInput): Promise<void>

// Pure client-side utilities (unchanged from mockData.ts):
export function getCategorySlug(category: Category): string
export function getCategoryFromSlug(slug: string): Category | null

// Timestamp formatting helper:
function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
```

### Migration from mock data

| Mock helper | Supabase replacement | Notes |
|---|---|---|
| `tools` (array import) | `getTools()` → `supabase.from('tools').select('*, tool_categories(categories(name))')` | Resolves categories via join |
| `getToolById(id)` | `getToolBySlug(slug)` → `supabase.from('tools').select('*...').eq('slug', slug).single()` | Uses slug, not tool_id |
| `getReviewsByToolId(id)` | `getReviewsByToolId(uuid)` → `supabase.from('review_snippets').select('*').eq('tool_id', uuid)` | Caller resolves slug→uuid first |
| `getDealsByToolId(id)` | `getDealsByToolId(uuid)` → `supabase.from('deals').select('*').eq('tool_id', uuid).eq('active', true)` | Filters inactive deals |
| `getToolsByCategory(cat)` | `getToolsByCategory(slug)` → `supabase.rpc('get_tools_by_category', { p_slug })` | RPC handles the join |
| `getDealsByCategory(cat)` | `getDealsByCategory(slug)` → `supabase.rpc('get_deals_by_category', { p_slug })` | RPC handles the join |
| `categories` (array import) | `getCategories()` → `supabase.rpc('get_category_counts')` | Returns computed counts |
| `getCategorySlug(cat)` | Keep as-is (pure string transform) | No DB call needed |
| `getCategoryFromSlug(slug)` | Keep as-is (pure string transform) | No DB call needed |

## Frontend architecture

### Next.js App Router structure

Routes:
```
app/
├── layout.tsx              # Root layout (Header + Footer + metadata)
├── page.tsx                # Home page (SSR)
├── globals.css             # Global Tailwind styles
├── tools/
│   ├── page.tsx            # All Tools — client component (search/filter/sort)
│   └── [category]/
│       └── page.tsx        # Category Tools — SSR (generateStaticParams)
├── deals/
│   ├── page.tsx            # All Deals — client component (search/filter/sort)
│   └── [category]/
│       └── page.tsx        # Category Deals — SSR (generateStaticParams)
├── tool/
│   └── [id]/
│       └── page.tsx        # Tool Detail — SSR shell with client tabs
└── methodology/
    └── page.tsx            # Static methodology page
```

### Rendering strategy
- **SSR (Server Components)**: Home page, Tool Detail page shell, Category pages (tools + deals), Methodology.
- **Client Components** (`'use client'`):
  - `/tools` page — interactive search, pricing filter, column sorting
  - `/deals` page — interactive search, offer type filter, column sorting, copy code, Claim Deal hover
  - `ReviewsSection` — sentiment pills, tag/channel filters, search, sort
  - `DealsTable` — copy code, Claim Deal hover
  - `Header` — mobile menu toggle state

### Category pages (SSR)
- Use `generateStaticParams()` to pre-render all category slugs at build time.
- Category slug format: `category.toLowerCase().replace(/\//g, '-').replace(/\s+/g, '-')`
- URL pattern: `/tools/<slug>` and `/deals/<slug>` (NOT `/tools/category/<slug>`)
- `getCategoryFromSlug()` helper maps slug back to display name.

### Component system
```
components/
├── ui/
│   ├── Container.tsx       # Global width container (max-w-6xl mx-auto px-6)
│   ├── Button.tsx          # Primary/secondary/ghost, 3 sizes, rounded
│   ├── Badge.tsx           # neutral/blue/pro/con variants, sm/md sizes, rounded
│   └── Tabs.tsx            # Radix UI accessible tabs wrapper
└── features/
    ├── Header.tsx          # Sticky header, desktop nav + mobile hamburger
    ├── Footer.tsx          # 3-column footer with helper text
    ├── ReviewsSection.tsx  # Client: sentiment/tag/channel/search/sort filtering
    └── DealsTable.tsx      # Client: copy code, Claim Deal hover
```

### Data layer (current: mock)
```
lib/
├── data/
│   └── mockData.ts         # Static tools, deals, reviewEvidence, categories
├── types/
│   └── index.ts            # TypeScript interfaces (Tool, Deal, ReviewEvidence, etc.)
└── utils.ts                # cn() utility (clsx + twMerge)
```

Helper functions exported from `mockData.ts`:
- `getDealsByToolId(toolId)` — deals for a specific tool
- `getToolsByCategory(category)` — tools in a category
- `getDealsByCategory(category)` — deals in a category
- `getCategorySlug(category)` — generates URL slug from category name
- `getCategoryFromSlug(slug)` — reverse lookup from slug to category

### Key implementation patterns

**Client-side filtering (Tools/Deals list pages):**
- `useMemo` for filtered/sorted results reacting to state changes
- `useState` for search query, selected filters, sort field/direction
- Category dropdown uses `useRouter().push()` to navigate to SSR category page

**Claim Deal hover (no layout shift):**
- Fixed-width cell (`w-[100px]`) + fixed inner container (`w-[88px] h-8`)
- Absolute positioning for both default icon and hover button
- `opacity` transition (NOT `display` toggle) prevents table width changes
- Uses Tailwind `group/row` and `group-hover/row:opacity-*` for row-level hover

**Copy Code:**
- `navigator.clipboard.writeText(code)` on badge click
- `useState` tracks which deal was just copied
- `setTimeout` clears the "copied" state after 2 seconds
- Visual: Copy icon → Check icon transition

**Review filtering (ReviewsSection):**
- Sentiment: segmented pill buttons (active = blue-600, inactive = gray-100)
- Tag/Channel: `<select>` dropdowns populated from review data
- Search: text input filtering snippet text, channel, and tags
- Sort: Most recent / Oldest by publish date

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
type OfferSize    = 'Small' | 'Medium' | 'Large' | 'Unknown';

// ── Interfaces ──────────────────────────────────
interface Tool {
  tool_id: string;
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
  review_id: string;
  tool_id: string;
  video_id: string;
  channel_name: string;
  video_title: string;
  publish_date: string;
  sentiment: Sentiment;
  tags: ReviewTag[];
  snippet_text: string;
  receipt_url: string;
  timestamp: string;
  sponsored_flag?: boolean;
}

interface Deal {
  deal_id: string;
  tool_id: string;
  offer_text: string;
  offer_type: OfferType;
  code?: string;
  link_url?: string;
  last_seen_date: string;
  receipt_url: string;
  timestamp: string;
  category: Category[];
  offer_size?: OfferSize;
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
  - `next.config.ts` must whitelist `images.unsplash.com` (and future logo domains) in `remotePatterns`.

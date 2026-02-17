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

The schema below maps directly to the TypeScript interfaces in `lib/types/index.ts`.
Supabase auto-generates a REST API (PostgREST) for every table, so most read queries need **zero custom API code**.

### Enum types

```sql
-- Constrained value sets (match the TS union types exactly)
create type pricing_model as enum ('Free', 'Free trial', 'Paid', 'Freemium', 'Unknown');
create type platform      as enum ('Web', 'iOS', 'Android', 'Desktop', 'API', 'Unknown');
create type category      as enum ('Repurposing', 'UGC Avatars', 'Captions',
                                   'Scripts/Hooks', 'Video Gen/B-roll', 'Dubbing/Voice');
create type sentiment     as enum ('Pro', 'Con', 'Neutral');
create type review_tag    as enum ('UI/UX', 'Output quality', 'Relevance', 'Speed',
                                   'Pricing', 'Cancellation/Refund', 'Limits',
                                   'Integrations', 'Watermark', 'Export quality',
                                   'Support', 'Reliability', 'Other');
create type offer_type    as enum ('Code', 'Link', 'Trial extension', 'Credit bonus', 'Unknown');
create type offer_size    as enum ('Small', 'Medium', 'Large', 'Unknown');
```

### Core tables

```sql
-- ════════════════════════════════════════════
-- tools
-- ════════════════════════════════════════════
create table tools (
  tool_id              text primary key,            -- slug, e.g. 'opus-clip'
  name                 text not null,
  logo_url             text not null,
  website_url          text not null,
  registration_url     text,                        -- nullable
  short_tagline        text not null,
  categories           category[] not null,          -- PG array of enum
  pricing_model        pricing_model not null default 'Unknown',
  platforms            platform[],                   -- nullable array
  review_sources_count integer default 0,
  last_seen_review_date date,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

-- ════════════════════════════════════════════
-- review_evidence
-- ════════════════════════════════════════════
create table review_evidence (
  review_id     text primary key,
  tool_id       text not null references tools(tool_id) on delete cascade,
  video_id      text not null,
  channel_name  text not null,
  video_title   text not null,
  publish_date  date not null,
  sentiment     sentiment not null,
  tags          review_tag[] not null,               -- PG array of enum
  snippet_text  text not null,
  receipt_url   text not null,                       -- YouTube URL with timestamp
  timestamp     text not null,                       -- video timestamp, e.g. '5:42'
  sponsored_flag boolean default false,
  created_at    timestamptz default now()
);

-- ════════════════════════════════════════════
-- deals
-- ════════════════════════════════════════════
create table deals (
  deal_id        text primary key,
  tool_id        text not null references tools(tool_id) on delete cascade,
  offer_text     text not null,
  offer_type     offer_type not null default 'Unknown',
  code           text,                               -- promo code (nullable)
  link_url       text,                               -- direct deal link (nullable)
  last_seen_date date not null,
  receipt_url    text not null,                       -- YouTube timestamp proof
  timestamp      text not null,                       -- video timestamp
  category       category[] not null,                 -- which categories this deal covers
  offer_size     offer_size default 'Unknown',
  created_at     timestamptz default now()
);

-- ════════════════════════════════════════════
-- reports  (user-submitted flags)
-- ════════════════════════════════════════════
create table reports (
  report_id   uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('review', 'deal')),
  entity_id   text not null,                         -- review_id or deal_id
  issue_type  text not null,
  notes       text,
  created_at  timestamptz default now()
);
```

### Indexes

```sql
create index idx_review_evidence_tool  on review_evidence(tool_id);
create index idx_review_evidence_date  on review_evidence(publish_date desc);
create index idx_deals_tool            on deals(tool_id);
create index idx_deals_last_seen       on deals(last_seen_date desc);
create index idx_tools_categories      on tools using gin(categories);
```

### Row Level Security (RLS)

All tables are **public-read**. Only the `reports` table accepts anonymous inserts.

```sql
-- tools, review_evidence, deals: public read-only
alter table tools enable row level security;
create policy "Public read" on tools for select using (true);

alter table review_evidence enable row level security;
create policy "Public read" on review_evidence for select using (true);

alter table deals enable row level security;
create policy "Public read" on deals for select using (true);

-- reports: public insert (anonymous), no read
alter table reports enable row level security;
create policy "Anyone can submit" on reports for insert with check (true);
```

### Future tables (ingestion pipeline)

These are not used by the UI but will support the data processing pipeline:

- **youtube_channels** — channel_id, name, subscriber_count, last_scraped_at
- **youtube_videos** — video_id, channel_id FK, title, publish_date, description, transcript
- **video_mentions** — video_id FK + tool_id FK + derived fields (join table for pipeline tracking)

---

## API surface (Supabase)

### What Supabase provides out of the box (PostgREST)

Every table gets an auto-generated REST API at `https://<project>.supabase.co/rest/v1/<table>`.
The UI needs **no custom API routes** for standard CRUD. All the queries the frontend currently does client-side translate directly to PostgREST query params:

| Frontend need | PostgREST query (via `supabase-js`) |
|---|---|
| All tools | `supabase.from('tools').select('*')` |
| Tool by ID | `supabase.from('tools').select('*').eq('tool_id', id).single()` |
| Tools by category | `supabase.from('tools').select('*').contains('categories', [cat])` |
| Tools search | `supabase.from('tools').select('*').or('name.ilike.%q%,short_tagline.ilike.%q%')` |
| Filter by pricing | `supabase.from('tools').select('*').eq('pricing_model', val)` |
| Sort tools | `.order('name' \| 'review_sources_count' \| 'last_seen_review_date', { ascending })` |
| Reviews for tool | `supabase.from('review_evidence').select('*').eq('tool_id', id)` |
| Reviews + filters | `.eq('sentiment', s).contains('tags', [tag]).ilike('channel_name', q)` |
| Deals for tool | `supabase.from('deals').select('*').eq('tool_id', id)` |
| Deals by category | `supabase.from('deals').select('*').contains('category', [cat])` |
| Deals search | `.or('offer_text.ilike.%q%,code.ilike.%q%')` + join tool name |
| Submit report | `supabase.from('reports').insert({ entity_type, entity_id, issue_type, notes })` |

### Custom RPCs needed (not provided out of the box)

These aggregations/joins are hard or impossible to express with PostgREST alone and should be implemented as **Supabase database functions (RPCs)**:

```sql
-- 1. Category counts (used by homepage + category nav)
--    Returns each category with its tool_count and deal_count.
create or replace function get_category_counts()
returns table (
  name       category,
  slug       text,
  tool_count bigint,
  deal_count bigint
) language sql stable as $$
  select
    c.cat as name,
    lower(replace(replace(c.cat::text, '/', '-'), ' ', '-')) as slug,
    (select count(*) from tools t where c.cat = any(t.categories)) as tool_count,
    (select count(*) from deals d where c.cat = any(d.category))   as deal_count
  from unnest(enum_range(null::category)) as c(cat);
$$;
-- Usage: supabase.rpc('get_category_counts')

-- 2. Tool detail with aggregated counts (optional optimization)
--    Combines tool + review count + deal count in one query.
create or replace function get_tool_detail(p_tool_id text)
returns json language sql stable as $$
  select json_build_object(
    'tool', (select row_to_json(t) from tools t where t.tool_id = p_tool_id),
    'review_count', (select count(*) from review_evidence r where r.tool_id = p_tool_id),
    'deal_count',   (select count(*) from deals d where d.tool_id = p_tool_id)
  );
$$;
-- Usage: supabase.rpc('get_tool_detail', { p_tool_id: 'opus-clip' })

-- 3. Full-text search across tools + deals (optional, for unified search bar)
create or replace function search_all(q text)
returns json language sql stable as $$
  select json_build_object(
    'tools', (select json_agg(t) from tools t
              where t.name ilike '%' || q || '%'
                 or t.short_tagline ilike '%' || q || '%'),
    'deals', (select json_agg(row_to_json(d))
              from deals d
              join tools t on t.tool_id = d.tool_id
              where d.offer_text ilike '%' || q || '%'
                 or d.code ilike '%' || q || '%'
                 or t.name ilike '%' || q || '%')
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

### Migration from mock data

The current helper functions in `lib/data/mockData.ts` map to Supabase as follows:

| Mock helper | Supabase replacement |
|---|---|
| `tools` (array import) | `supabase.from('tools').select('*')` |
| `getToolById(id)` | `supabase.from('tools').select('*').eq('tool_id', id).single()` |
| `getReviewsByToolId(id)` | `supabase.from('review_evidence').select('*').eq('tool_id', id)` |
| `getDealsByToolId(id)` | `supabase.from('deals').select('*').eq('tool_id', id)` |
| `getToolsByCategory(cat)` | `supabase.from('tools').select('*').contains('categories', [cat])` |
| `getDealsByCategory(cat)` | `supabase.from('deals').select('*').contains('category', [cat])` |
| `categories` (array import) | `supabase.rpc('get_category_counts')` |
| `getCategorySlug(cat)` | Keep as client-side utility (pure string transform) |
| `getCategoryFromSlug(slug)` | Keep as client-side utility (pure string transform) |

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

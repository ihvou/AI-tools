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

## Database entities (recommended)
- tools
- categories
- tool_categories (join table)
- youtube_channels
- youtube_videos
- video_mentions (tool_id + video_id + derived fields)
- review_snippets (tool_id + video_id + sentiment + topics + quote + receipt timestamp/link)
- deals (tool_id + video_id + offer + code + link_url + last_seen + receipt timestamp/link)
- reports (type=review/deal, entity_id, issue_type, notes, created_at)

## API surface (Supabase)
- Read:
  - /tools (filters: search, category, pricing, sort)
  - /deals (filters: tool search, category, offer_type, sort)
  - /tools/:slug (tool metadata)
  - /tools/:slug/reviews (filters: sentiment, tags, channel, text search, sort)
  - /tools/:slug/deals (sort)
  - /categories (counts tools/deals)
- Write:
  - /reports (create report entries)

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
├── types.ts                # TypeScript interfaces (Tool, Deal, ReviewEvidence, etc.)
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
```typescript
type Category = 'Captions' | 'AI Video Generation' | 'Editing/Effects' | ...;
type Sentiment = 'Pro' | 'Con' | 'Neutral';
type ReviewTag = 'Ease of Use' | 'Accuracy' | 'Speed' | ...;

interface Tool {
  tool_id: string;
  name: string;
  short_tagline: string;
  logo_url: string;
  categories: Category[];
  pricing_model: string;
  review_sources_count: number;
  official_url: string;
  // ...
}

interface Deal {
  deal_id: string;
  tool_id: string;
  offer_text: string;
  offer_type: string;
  code?: string;
  link_url?: string;
  receipt_url: string;
  timestamp: string;
  last_seen_date: string;
}

interface ReviewEvidence {
  review_id: string;
  tool_id: string;
  sentiment: Sentiment;
  tags: ReviewTag[];
  snippet_text: string;
  channel_name: string;
  publish_date: string;
  receipt_url: string;
  timestamp: string;
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

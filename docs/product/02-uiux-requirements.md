# AI Tools — UI/UX Requirements (Detailed)

This document reflects the agreed structure and constraints, aligned with the provided mockups and the corrections applied during implementation (layout width, header consistency, missing filters, consistent rounding, Claim Deal hover, branding updates, mobile layouts, and merged category routes).

## Global design principles
- **Minimalistic**: clean typography, neutral grays, one accent blue (`blue-600`).
- **Consistency**:
  - One global container width for ALL pages/tabs (`Container` component).
  - One header pattern for ALL pages.
  - Inputs/buttons/badges/pills share consistent sizes, spacing, and **border-radius** (`rounded` = 4px everywhere).
- **Proof-first**: every review snippet and deal has a **receipt** (YouTube timestamp link) when available.
- **No invented metadata**: only show fields obtainable from tool aggregators or YouTube (video metadata, descriptions, transcripts).

## Global layout rules (fix inconsistent width)
- Use a single page container everywhere (header/content/footer) via the `Container` component.
- Desktop max-width: ~1120-1200px; padding 24px.
- Tablet padding ~20px. Mobile padding 16px.
- Tables should not overflow the container; never change width between pages/tabs.

## Consistent border-radius rule
All interactive and decorative elements use `rounded` (Tailwind = 4px):
- **Buttons** (primary, secondary, ghost): `rounded`
- **Badges/chips** (category labels, deal counts, sentiment tags, code pills): `rounded`
- **Tool logos** (all sizes): `rounded`
- **Inputs and selects** (search fields, filter dropdowns): `rounded`
- **Review cards**: `rounded` border
- **Category cards** (homepage grid): `rounded` border
- **Claim Deal hover button**: `rounded`
- **Sentiment filter pills**: `rounded`

No element should use `rounded-full`, `rounded-md`, or `rounded-lg` unless explicitly overridden for a specific design reason.

## Header
### Desktop header
- Left: "AV" mark in blue rounded square + **"AI Tools"**.
- Right: ONLY two links:
  - **Tools**
  - **Deals**
- No header search.
- No Methodology link in desktop header.
- No Submit Tool button anywhere.

### Mobile header
- Left: logo + **"AI Tools"**.
- Right: hamburger icon.
- Drawer items:
  - Tools
  - Deals
  - Methodology

## Footer (Methodology is footer-only on desktop)
- 3 columns:
  - Browse: Tools, Deals
  - About: Methodology, Contact
  - Legal: Privacy, Terms
- Bottom helper line:
  "Receipts link to the timestamp where a claim or offer is mentioned. Data is sourced from YouTube video metadata, descriptions, and transcripts."

## Reporting (required)
Add a tiny "Report" action:
- In **Reviews**: report invalid receipt link, wrong timestamp, wrong topic, wrong sentiment, duplicates, etc.
- In **Deals**: report invalid/expired code, wrong offer text, wrong timestamp, broken receipt.

UI requirement:
- Must be subtle (icon + "Report" link), not a primary button.
- Use a small modal form (issue type dropdown + optional details + optional email).

## Pages and states

### 0) Home page (`/`)
Goal: brief intro + quick access + previews. Server component using `getAppData()`.

Top (compact, not tall):
- H1: **"AI Tools Reviews and Deals"**
- One short sentence explaining the value: "Find AI video ad tools and promo offers backed by YouTube timestamp receipts."
- Two buttons:
  - Primary: Browse tools (`rounded`, `blue-600`)
  - Secondary: See deals (`rounded`, outline style)
Keep this section tight so content starts near the fold.

Block A — Tools preview
- Title "Tools" + link "View all tools ->"
- Table columns:
  - Tool (logo `rounded` + name + 1-line description) — always visible
  - Category (badges `rounded`; show 2 max + "+n") — `hidden md:table-cell`
  - Pricing — `hidden sm:table-cell`
  - **Reviews** (e.g., "24") — always visible
  - Deals (small badge with count if available, links to tool detail deals tab) — always visible
- Show first 8 rows.
- **Mobile columns visible: Tool, Reviews, Deals** (3 columns).

Block B — Deals preview (client component: `DealsPreviewTable`)
- Title "Deals" + link "View all deals ->"
- Table columns:
  - Tool (logo `rounded` + name) — always visible
  - Offer — `hidden sm:table-cell`
  - Code (badge `rounded` / "Link deal" / "No code") — always visible
  - Last seen — `hidden md:table-cell`
  - Receipt (timestamp link "13:02") — `hidden md:table-cell`
  - **Claim** (external link icon) — always visible
  - **Ellipsis (more)** — `sm:hidden` (mobile only, opens bottom sheet)
- Show first 6 rows.
- **Mobile columns visible: Tool, Code, Claim, Ellipsis** (4 columns).

Block C — Categories grid
- Cards (`rounded` border, desktop: 2 rows x 3 cards; mobile stacked):
  - Category name
  - counts "X tools - Y deals"
  - links:
    - "Tools in <Category> ->" links to `/tools/<slug>`
    - "Deals in <Category> ->" links to `/deals/<slug>`

### 1) Tools List page (`/tools` and `/tools/<slug>`)
**Single client component** handling both the "All Tools" view and category-filtered views via Next.js optional catch-all route `[[...category]]`.

When a category slug is present in the URL (e.g. `/tools/repurposing`):
- Title changes to "{Category} Tools" (e.g., "Repurposing Tools")
- Category dropdown pre-selects the active category
- Data is filtered to that category
- Search, pricing filter, sort, and "Has deals" filter all remain functional

When no category slug (just `/tools`):
- Title: "All Tools"
- Category dropdown shows "All categories"

Top area:
- H1: dynamic ("All Tools" or "{Category} Tools")
- Filters row below title:
  - Search input "Search tools..." (`rounded`)
  - Category dropdown (`rounded`) — **updates URL** to `/tools/<slug>` on selection (selecting "All" navigates to `/tools`)
  - Pricing filter dropdown (`rounded`)
  - **"Has deals" checkbox** — filters to only show tools that have at least one associated deal
- Sort: clickable column headers (Tool name, Reviews, Pricing, Last seen) with sort indicator icons

Tools table columns:
- Tool (logo `rounded` + name + 1-line description) — always visible
- Category (badges `rounded`) — `hidden md:table-cell`
- Pricing — `hidden sm:table-cell`
- **Reviews** (number, e.g. "42") — always visible
- Last seen — `hidden lg:table-cell`
- Deals badge (count linking to tool detail deals tab) — always visible

**Mobile columns visible: Tool, Reviews, Deals** (3 columns).

Interactions:
- Row/tool click opens Tool Details (Reviews tab default).
- Clicking deal count badge opens Tool Details on Deals tab (`?tab=deals`).
- Category dropdown navigates via `router.push()`.

"Showing N of M tools" counter below filters.

Data fetching: `useEffect` + `fetch('/api/frontend-data')` on mount.

Loading state: "Loading tools..." in table body while data is loading.

Category slug format: `category.toLowerCase().replace(/\//g, '-').replace(/\s+/g, '-')`

Example routes:
- `/tools` — all tools
- `/tools/captions` — Captions tools
- `/tools/ai-video-generation` — AI Video Generation tools
- `/tools/editing-effects` — Editing/Effects tools

### 2) Deals List page (`/deals` and `/deals/<slug>`)
**Single client component** handling both "All Deals" and category-filtered views via Next.js optional catch-all route `[[...category]]`.

Same pattern as Tools List:
- Category slug in URL pre-selects category and filters data
- Title: "All Deals" or "{Category} Deals"
- All filters (search, category dropdown, offer type dropdown) and sorting remain functional

Top area:
- H1: dynamic ("All Deals" or "{Category} Deals")
- Filters row:
  - Search input "Search deals..." (`rounded`)
  - Category dropdown (`rounded`) — updates URL to `/deals/<slug>` on selection
  - Offer type dropdown (`rounded`)
- Sort: clickable column headers (Tool, Offer, Last seen) with sort indicator icons

Deals table columns:
- Tool (logo `rounded` + name) — always visible
- Offer — `hidden sm:table-cell`
- Code (badge `rounded` + Copy button; "Link deal" badge; or "No code") — always visible
- Last seen — `hidden md:table-cell`
- Receipt (timestamp link with external-link icon) — `hidden md:table-cell`
- **Claim** column — always visible (see below)
- **Ellipsis (more)** — `sm:hidden` (mobile only, opens bottom sheet)

**Claim column behavior (desktop):**
- Fixed-width cell (`w-[100px]`) to prevent layout shift
- Default state: subtle external-link icon (gray)
- **Row hover**: icon fades out, blue "Claim Deal" button fades in via opacity transition
- Uses `opacity-0 -> opacity-100` with `transition-opacity` (NOT `display: none -> block`, which causes table jump)
- Links to `deal.link_url` or falls back to `deal.receipt_url`

**Claim column behavior (mobile):**
- Just a blue ExternalLink icon linking to the claim URL

**"Link deal" badge:**
- When a deal has `offer_type === 'Link'` but no promo code, show `<Badge variant="neutral" size="sm">Link deal</Badge>` in the Code column

**Copy Code behavior:**
- Click code badge to copy to clipboard via `navigator.clipboard.writeText()`
- Copy icon appears on hover next to badge
- After copy: green check icon replaces copy icon for 2 seconds

**Mobile columns visible: Tool, Code, Claim, Ellipsis** (4 columns).
**Mobile Ellipsis**: opens `DealBottomSheet` with full deal details.

"Showing N of M deals" counter below filters.

Data fetching: `useEffect` + `fetch('/api/frontend-data')` on mount.

Loading state: "Loading deals..." in table body while data is loading.

### 3) Tool Details page (`/tool/[id]`)
Server component shell using `getAppData()`, with client tabs.

Top header section:
- Left: logo (`rounded`, larger), tool name, 1-line description.
- Meta line:
  - category badges (`rounded`)
  - pricing tier
  - platform(s) (optional)
  - "X reviews" (actual review count, not `review_sources_count`)
  - "Last seen <date>"
- Right: Primary CTA "Go to official site" with ExternalLink icon (clean button, consistent height, `rounded`).
- Below CTA: "Open deals tab" link (if tool has deals).

Tabs (using accessible Radix UI Tabs, client component: `ToolDetailTabs`):
- Reviews(n) (default)
- Deals(n)
- Uses `useSearchParams()` to read `?tab=deals` param and set correct default tab
- Wrapped in `<Suspense>` boundary (required for `useSearchParams()`)

#### 3A) Reviews tab (client component: `ReviewsSection`)
Filters:
- Sentiment segmented pills (`rounded`): All / Pro / Con / Neutral — active pill is `blue-600` white text
- Tag dropdown (`rounded`)
- Channel/creator dropdown (`rounded`)
- Sort dropdown (`rounded`): Most recent / Oldest
- "Search within snippets..." full-width search input (`rounded`)

Review cards (`rounded` border):
- Badges row: sentiment badge (color-coded: green/Pro, red/Con, neutral/gray) + topic badges
- Snippet text (quote)
- Footer: channel + date
- Actions (right):
  - Receipt link "Receipt (5:42)" with external-link icon
  - Tiny "Report" link/icon

"Showing N of M reviews" counter at bottom.

Empty state: "No reviews match your filters."

#### 3B) Deals tab (client component: `DealsTable`)
Tool-specific deals table:
- Offer — always visible
- Code (badge `rounded` + Copy / "Link deal" / "No code") — always visible
- Last seen — `hidden md:table-cell`
- Receipt link with Report button — `hidden md:table-cell`
- **Claim** column (same fixed-width hover pattern as Deals List page) — always visible
- **Ellipsis (more)** — `sm:hidden` (mobile only, opens bottom sheet)

### 4) Methodology page (`/methodology`) — Static
Sections:
- Data Collection
- What Are "Receipts"
- Data Sources
- Limitations
- Report Issues

## Mobile bottom sheet (`DealBottomSheet`)
Triggered by tapping the ellipsis (...) icon on deal table rows on mobile.

**Structure:**
- Fixed bottom panel with slide-up animation (`translate-y-full -> translate-y-0`, 200ms `ease-out`)
- Semi-transparent black backdrop (click to close)
- Rounded top corners (`rounded-t-2xl`)
- Drag handle bar at top (gray pill)
- Close (X) button in header

**Content sections:**
- **Header**: Tool logo (`rounded`) + tool name + pricing tier
- **Offer**: Full offer text
- **Type + Code row**: Offer type label + Code badge with copy (or "Link deal" badge / "No code")
- **Last seen + Receipt row**: Date + receipt timestamp link
- **CTA**: Full-width "Claim Deal" button (`blue-600`, `rounded`) with ExternalLink icon
- **Bottom spacer**: `<div className="h-6 pb-safe" />` for iOS safe area

**Behaviors:**
- Body scroll is locked while sheet is open (`document.body.style.overflow = 'hidden'`)
- Copy code works inside the bottom sheet (same pattern as table)
- Close triggers reverse animation, then unmounts after 200ms

## States, loading, and empty cases
- **Loading state**: "Loading tools..." / "Loading deals..." message in table body (via `isLoading` state)
- Empty state with "No [items] found matching your filters." message.
- If receipt missing: show "Receipt unavailable" + allow report.
- Copy action: shows green check icon for 2 seconds after copy.

## Component consistency rules
- **Buttons**: primary blue-600 (h-8/h-10/h-11), secondary outline, ghost, link-style tiny actions. All `rounded`.
- **Inputs**: consistent height, `rounded`, border-gray-200, focus ring blue-500.
- **Badges**: `rounded`, sizes sm (px-2.5 py-0.5 text-xs) and md (px-3 py-1 text-sm). Variants: neutral (gray-100), blue (blue-50 + blue border), pro (green-50 + green border), con (red-50 + red border).
- **Logos**: `rounded`, displayed with `object-cover` via Next.js Image component.
- **External links**: always show external-link icon.
- **Reporting**: always a small modal, consistent fields.
- **Tables**: no layout shift on hover interactions (use fixed widths + opacity transitions).

## Responsive breakpoints summary
| Column | Home tools | Home deals | Tools page | Deals page | Deals (tool detail) |
|--------|-----------|------------|-----------|------------|-------------------|
| Tool | always | always | always | always | - |
| Description | `hidden sm:block` (in tool cell) | - | `hidden sm:block` (in tool cell) | - | - |
| Category | `hidden md` | - | `hidden md` | - | - |
| Pricing | `hidden sm` | - | `hidden sm` | - | - |
| Reviews | always | - | always | - | - |
| Deals badge | always | - | always | - | - |
| Offer | - | `hidden sm` | - | `hidden sm` | always |
| Code | - | always | - | always | always |
| Last seen | - | `hidden md` | - | `hidden md` | `hidden md` |
| Receipt | - | `hidden md` | - | `hidden md` | `hidden md` |
| Claim | - | always | - | always | always |
| Ellipsis | - | `sm:hidden` | - | `sm:hidden` | `sm:hidden` |

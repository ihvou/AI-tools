# AI Tools — UI/UX Requirements (Detailed)

This document reflects the agreed structure and constraints, aligned with the provided mockups and the corrections applied during implementation (layout width, header consistency, missing filters, consistent rounding, Claim Deal hover, and branding updates).

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
- Desktop max-width: ~1120–1200px; padding 24px.
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

### 0) Home page
Goal: brief intro + quick access + previews.

Top (compact, not tall):
- H1: **"AI Tools Reviews and Deals"**
- One short sentence explaining the value: "Find AI video ad tools and promo offers backed by YouTube timestamp receipts."
- Two buttons:
  - Primary: Browse tools (`rounded`, `blue-600`)
  - Secondary: See deals (`rounded`, outline style)
Keep this section tight so content starts near the fold.

Block A — Tools preview
- Title "Tools" + link "View all tools →"
- Table columns (desktop):
  - Tool (logo `rounded` + name + 1-line description)
  - Category (badges `rounded`; show 2 max + "+n")
  - Pricing
  - Evidence (e.g., "24 videos")
  - Deals (small badge "1 deal" if available, links to tool detail deals tab)
- Show first 8 rows.

Block B — Deals preview
- Title "Deals" + link "View all deals →"
- Table columns (desktop):
  - Tool (logo `rounded` + name)
  - Offer
  - Code (badge `rounded` / "No code")
  - Last seen
  - Receipt (timestamp link "13:02 ↗")
- Show first 6 rows.

Block C — Categories grid
- Cards (`rounded` border, desktop: 2 rows x 3 cards; mobile stacked):
  - Category name
  - counts "X tools · Y deals"
  - links:
    - "Tools in <Category> →" → links to `/tools/<slug>`
    - "Deals in <Category> →" → links to `/deals/<slug>`

Mobile Home
- Convert tables to stacked lists, keep the same actions.
- Preserve consistency with header/footer container width.

### 1) Tools List page (`/tools`)
Client component with interactive search, filters, and sorting.

Top area:
- H1: "All Tools"
- Filters row below title:
  - Search input "Search tools…" (`rounded`)
  - Category dropdown (`rounded`) — **navigates** to `/tools/<slug>` on selection (not a client-side filter)
  - Pricing filter dropdown (`rounded`)
- Sort: clickable column headers (Tool name, Evidence, Pricing) with sort indicator icons

Tools table (desktop):
- Tool (logo `rounded` + name + 1-line description)
- Category (badges `rounded`)
- Pricing
- Evidence (e.g., "42 videos")
- Deals badge ("1 deal")

Interactions:
- Row/tool click opens Tool Details (Reviews tab default).
- Clicking "1 deal" opens Tool Details on Deals tab.
- Category dropdown navigates to SSR category page.

"Showing N of M tools" counter below filters.

Mobile:
- Filters stack vertically.
- Responsive column hiding (categories hidden on mobile, some columns hidden on tablet).

### 1b) Tools Category page (`/tools/[category]`) — SSR
Server-side rendered for SEO.

Top area:
- Back link: "← All Tools" → `/tools`
- H1: "<Category> Tools"

Table: same structure as Tools List, pre-filtered server-side to the given category.

Category slug format: `category.toLowerCase().replace(/\//g, '-').replace(/\s+/g, '-')`

Example routes:
- `/tools/captions`
- `/tools/ai-video-generation`
- `/tools/editing-effects`

### 2) Deals List page (`/deals`)
Client component with interactive search, filters, and sorting.

Top area:
- H1: "All Deals"
- Filters row:
  - Search input "Search deals…" (`rounded`)
  - Category dropdown (`rounded`) — **navigates** to `/deals/<slug>` on selection
  - Offer type dropdown (`rounded`)
- Sort: clickable column headers (Tool, Offer, Last seen) with sort indicator icons

Deals table (desktop):
- Tool (logo `rounded` + name)
- Offer
- Code (badge `rounded` + Copy button; or "No code")
- Last seen
- Receipt (timestamp link with external-link icon)
- **Claim Deal** column (see below)

**Claim Deal column behavior:**
- Fixed-width cell (`w-[100px]`) to prevent layout shift
- Default state: subtle external-link icon (gray)
- **Row hover**: icon fades out, blue "Claim Deal" button fades in via opacity transition
- Uses `opacity-0 → opacity-100` with `transition-opacity` (NOT `display: none → block`, which causes table jump)
- Links to `deal.link_url` or falls back to `deal.receipt_url`

**Copy Code behavior:**
- Click code badge to copy to clipboard via `navigator.clipboard.writeText()`
- Copy icon appears on hover next to badge
- After copy: green check icon replaces copy icon for 2 seconds

Mobile:
- Stack items with Code+Copy, Receipt link.
- Some columns hidden at smaller breakpoints.

### 2b) Deals Category page (`/deals/[category]`) — SSR
Server-side rendered for SEO.

Top area:
- Back link: "← All Deals" → `/deals`
- H1: "Deals in <Category>"

Table: same structure as Deals List, pre-filtered server-side. Claim Deal button always visible (no hover toggle needed on SSR page).

### 3) Tool Details page (`/tool/[id]`)
Top header section:
- Left: logo (`rounded`, larger), tool name, 1-line description.
- Meta line:
  - category badges (`rounded`)
  - pricing tier
  - platform(s) (optional)
  - "X videos indexed"
  - "Last seen <date>"
- Right: Primary CTA "Visit <tool name> ↗" (clean button, consistent height, `rounded`).

Tabs (using accessible Radix UI Tabs):
- Reviews(n) (default)
- Deals(n)

#### 3A) Reviews tab (client component: `ReviewsSection`)
Filters:
- Sentiment segmented pills (`rounded`): All / Pro / Con / Neutral — active pill is `blue-600` white text
- Tag dropdown (`rounded`)
- Channel/creator dropdown (`rounded`)
- Sort dropdown (`rounded`): Most recent / Oldest
- "Search within snippets…" full-width search input (`rounded`)

Review cards (`rounded` border):
- Badges row: sentiment badge (color-coded: green/Pro, red/Con, neutral/gray) + topic badges
- Snippet text (quote)
- Footer: channel + date
- Actions (right):
  - Receipt link "Receipt (5:42) ↗" with external-link icon
  - Tiny "Report" link/icon

"Showing N of M reviews" counter at bottom.

Empty state: "No reviews match your filters."

#### 3B) Deals tab (client component: `DealsTable`)
Tool-specific deals table:
- Offer
- Code (badge `rounded` + Copy / "No code")
- Last seen
- Receipt link with Report button
- **Claim Deal** column (same fixed-width hover pattern as Deals List page)

### 4) Methodology page (`/methodology`) — Static
Sections:
- Data Collection
- What Are "Receipts"
- Data Sources
- Limitations
- Report Issues

## States, loading, and empty cases
- Skeleton loading for tables and review cards.
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

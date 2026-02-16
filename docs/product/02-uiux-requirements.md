# AI Video Ads Hub — UI/UX Requirements (Detailed)

This document reflects the agreed structure and constraints, aligned with the provided mockups and the issues found in earlier exports (layout width, header consistency, missing filters, and “ugly” header buttons).

## Global design principles
- **Minimalistic**: clean typography, neutral grays, one accent blue.
- **Consistency**:
  - One global container width for ALL pages/tabs.
  - One header pattern for ALL pages.
  - Inputs/buttons/chips share consistent sizes and spacing.
- **Proof-first**: every review snippet and deal has a **receipt** (YouTube timestamp link) when available.
- **No invented metadata**: only show fields obtainable from tool aggregators or YouTube (video metadata, descriptions, transcripts).

## Global layout rules (fix inconsistent width)
- Use a single page container everywhere (header/content/footer).
- Desktop max-width: ~1120–1200px; padding 24px.
- Tablet padding ~20px. Mobile padding 16px.
- Tables should not overflow the container; never change width between pages/tabs.

## Header (fix inconsistent header)
### Desktop header
- Left: “AV” mark in blue rounded square + “AI Video Ads Hub”.
- Right: ONLY two links:
  - **Tools**
  - **Deals**
- No header search.
- No Methodology link in header.
- No Submit Tool button anywhere.

### Mobile header
- Left: logo + short name (“AVAH” acceptable if space constrained).
- Right: hamburger icon.
- Drawer items:
  - Tools
  - Deals
  - Methodology
  - Contact
  - Privacy
  - Terms

## Footer (Methodology is footer-only)
- 3 columns:
  - Browse: Tools, Deals
  - About: Methodology, Contact
  - Legal: Privacy, Terms
- Bottom helper line:
  “Receipts link to the timestamp where a claim or offer is mentioned. Data is sourced from YouTube video metadata, descriptions, and transcripts.”

## Reporting (required)
Add a tiny “Report” action:
- In **Reviews**: report invalid receipt link, wrong timestamp, wrong topic, wrong sentiment, duplicates, etc.
- In **Deals**: report invalid/expired code, wrong offer text, wrong timestamp, broken receipt.

UI requirement:
- Must be subtle (icon + “Report” link), not a primary button.
- Use a small modal form (issue type dropdown + optional details + optional email).

## Pages and states

### 0) Home page
Goal: brief intro + quick access + previews.

Top (compact, not tall):
- H1: “AI Video Ads Hub”
- One short sentence explaining the value
- Two buttons:
  - Primary: Browse tools
  - Secondary: See deals
Keep this section tight so content starts near the fold.

Block A — Tools preview
- Title “Tools” + link “View all tools →”
- Table columns (desktop):
  - Tool (logo + name + 1-line description)
  - Category (chips; show 2 max + “+n”)
  - Pricing
  - Evidence (e.g., “24 videos”)
  - Deals (small pill “1 deal” if available)
- Show ~6–10 rows.

Block B — Deals preview
- Title “Deals” + link “View all deals →”
- Table columns (desktop):
  - Tool
  - Offer
  - Code (pill + Copy; or “No code”)
  - Last seen
  - Receipt (timestamp link “13:02 ↗”)
  - Report icon (tiny)
- Show ~6–10 rows.

Block C — Categories grid
- Cards (desktop: 2 rows x 3 cards; mobile stacked):
  - Category name
  - counts “X tools • Y deals”
  - links:
    - “Tools in <Category> →”
    - “Deals in <Category> →”

Mobile Home
- Convert tables to stacked lists, keep the same actions.
- Preserve consistency with header/footer container width.

### 1) Tools List page
States:
- All Tools
- Category state for Search engine optimization (SEO)

Top area:
- H1: “All Tools” OR “Tools in <Category>”
- Filters row below title:
  - Search input “Search tools…”
  - Category dropdown (preselected for category state)
  - “Has deals” toggle/button
  - Sort dropdown (right aligned)

Sort options (minimal):
- Most evidence
- Recently seen
- Name A–Z

Tools table (desktop):
- Tool (logo + name + 1-line description)
- Category (chips)
- Pricing
- Evidence (e.g., “42 videos”)
- Last seen (date)
- Deals pill (“1 deal”)

Interactions:
- Row/tool click opens Tool Details (Reviews tab default).
- Clicking “1 deal” opens Tool Details on Deals tab.

Mobile:
- Filters stack vertically.
- List items instead of full table columns.
- Show “Showing N tools” at bottom.

SEO category routing:
- /tools/category/<slug>

### 2) Deals List page
States:
- All Deals
- Category state for SEO

Top area:
- H1: “All Deals” OR “Deals in <Category>”
- Filters row:
  - Search by tool name
  - Category dropdown
  - Optional offer-size dropdown ONLY if reliably parseable
  - Sort dropdown

Sort options:
- Recently seen (default)
- Tool name A–Z
- Biggest offer (ONLY if offer-size data is reliable)

Deals table (desktop):
- Tool
- Offer
- Code (pill + Copy / “No code”)
- Last seen
- Receipt (timestamp link)
- Report icon column

Mobile:
- Stack items with Code+Copy, Receipt link, Report icon.

SEO category routing:
- /deals/category/<slug>

### 3) Tool Details page
Top header section (must not look “ugly”):
- Left: logo (larger), tool name, 1-line description.
- Meta line:
  - category chips
  - pricing tier
  - platform(s) (optional)
  - “X videos indexed”
  - “Last seen <date>”
- Right: Primary CTA “Go to official site ↗” (clean button, consistent height).
- Optional small link under CTA: “Open deals tab” (shown only on Reviews tab).

Tabs:
- Reviews(n) (default)
- Deals(n)

#### 3A) Reviews tab (must include missing filters)
Filters:
- Sentiment segmented pills: All / Pro / Con / Neutral
- Topic dropdown (prefer multi-select)
- Optional creator/channel filter input
- Sort dropdown (most recent / oldest)
- “Search within snippets…” full-width search input

Review cards:
- Chips row: sentiment + topic chips
- Snippet text (quote)
- Footer: channel + date
- Actions (right):
  - Receipt link “Receipt (5:42) ↗”
  - Tiny “Report” link/icon

Pagination:
- “Load more” or infinite scroll; keep minimal.

#### 3B) Deals tab
Tool-specific deals table:
- Offer
- Code (pill + Copy / “No code”)
- Last seen
- Receipt link
- Tiny report icon per row

Optional small filters only when deal count is large:
- Deal type (Promo code / Referral link)
- Sort by recently seen

## States, loading, and empty cases
- Skeleton loading for tables and review cards.
- Empty state with “Reset filters”.
- If receipt missing: show “Receipt unavailable” + allow report.
- Copy action: show subtle “Copied” toast.

## Component consistency rules
- Buttons: primary blue (40–44px), secondary outline, link-style tiny actions.
- Inputs: consistent height, radius, and borders.
- Chips: consistent styling across pages.
- External links: always show external-link icon.
- Reporting: always a small modal, consistent fields.

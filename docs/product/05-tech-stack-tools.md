# AI Video Ads Hub — Technologies Used for Implementation

## UI/UX design workflow
### Figma Make
Used to draft layouts and UI structure quickly:
- page layouts (Home, Tools, Deals, Tool Details)
- component styling (buttons, chips, tables)
- responsive behavior

### Stitch
Used to export design into implementation-friendly artifacts.

Key learnings from this work:
- exports must be reviewed for:
  - inconsistent widths
  - inconsistent headers
  - missing UI states/filters
  - awkward button styling (notably on Tool Details header)

The spec explicitly tightens these areas to prevent regression.

## Frontend implementation
### Claude Code
Used as the primary assistant to implement:
- Next.js (or React) components and pages
- responsive tables/lists matching the mockups
- filters, sorting, pagination patterns
- “Report” modal flows
- consistent layout container and header/footer reuse

Recommendation:
- Use a strict component library pattern (even if custom) to avoid drift:
  - Button, Input, Chip, TableRow, Modal, LayoutContainer

## Backend and database
### Supabase
Used for:
- PostgreSQL database tables (tools, deals, reviews, videos, categories, reports)
- API access for the frontend (querying and filtering)
- optional Row Level Security (RLS) if needed for write endpoints (reports)

## Data processing and ingestion
### Supabase Edge Functions
Used for:
- pulling tool metadata from aggregators (where available)
- discovering YouTube videos for each tool
- fetching transcripts/captions
- extracting review snippets and promo codes
- normalization + upserts + dedupe
- scheduled refresh jobs

### Claude Code (backend + processing assistance)
Used to:
- scaffold Edge Functions
- implement parsing logic (descriptions + transcript patterns)
- implement dedupe and normalization functions
- add logging and basic observability

## Practical division of labor (recommended)
1. Figma Make: finalize mockups + responsive behavior.
2. Stitch: export; identify gaps; update the UI/UX spec.
3. Claude Code: implement frontend with a shared layout shell (header/footer/container).
4. Supabase: create schema + indexes; implement read queries.
5. Edge Functions: implement ingestion pipeline.
6. Claude Code: refine pipeline and connect frontend to Supabase queries.
7. Iterate via “Report” feedback from users.

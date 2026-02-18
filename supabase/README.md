# Supabase Setup

This folder contains database migrations for AI Video Ads Hub.

## Applied schema

- `supabase/migrations/20260217230000_init_ai_tools_schema.sql`
  - core entities from `docs/product/03-tech-architecture.md`
  - indexes and constraints
  - baseline RLS policies

## How to apply

Use either path below:

1. Supabase Dashboard SQL Editor
- Open your project SQL Editor.
- Run the migration SQL in `supabase/migrations/20260217230000_init_ai_tools_schema.sql`.

2. Supabase CLI (recommended for team workflow)
- Initialize Supabase locally (`supabase init`) if needed.
- Link your project (`supabase link --project-ref <your-ref>`).
- Push migrations (`supabase db push`).

## Environment variables

Use `.env.local` with:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)

Do not commit real keys.

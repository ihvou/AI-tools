-- Align existing Supabase schema with frontend TypeScript model in lib/types/index.ts
-- This migration intentionally alters in place (no table drops).

-- 1) Missing columns
alter table public.tools
  add column if not exists registration_url text,
  add column if not exists last_seen_review_date date;

alter table public.review_snippets
  add column if not exists video_title text not null default '',
  add column if not exists sponsored_flag boolean default false;

alter table public.deals
  add column if not exists category text[];

-- 2) Rename columns to match frontend names
-- tools.official_url -> tools.website_url
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tools' AND column_name = 'official_url'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tools' AND column_name = 'website_url'
  ) THEN
    ALTER TABLE public.tools RENAME COLUMN official_url TO website_url;
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tools' AND column_name = 'official_url'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tools' AND column_name = 'website_url'
  ) THEN
    UPDATE public.tools
    SET website_url = coalesce(website_url, official_url)
    WHERE website_url IS NULL;
    ALTER TABLE public.tools DROP COLUMN official_url;
  END IF;
END $$;

alter table public.tools add column if not exists website_url text;

-- review_snippets.quote -> review_snippets.snippet_text
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'review_snippets' AND column_name = 'quote'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'review_snippets' AND column_name = 'snippet_text'
  ) THEN
    ALTER TABLE public.review_snippets RENAME COLUMN quote TO snippet_text;
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'review_snippets' AND column_name = 'quote'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'review_snippets' AND column_name = 'snippet_text'
  ) THEN
    UPDATE public.review_snippets
    SET snippet_text = coalesce(snippet_text, quote)
    WHERE snippet_text IS NULL;
    ALTER TABLE public.review_snippets DROP COLUMN quote;
  END IF;
END $$;

-- review_snippets.topics -> review_snippets.tags
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'review_snippets' AND column_name = 'topics'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'review_snippets' AND column_name = 'tags'
  ) THEN
    ALTER TABLE public.review_snippets RENAME COLUMN topics TO tags;
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'review_snippets' AND column_name = 'topics'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'review_snippets' AND column_name = 'tags'
  ) THEN
    UPDATE public.review_snippets
    SET tags = coalesce(tags, topics)
    WHERE tags IS NULL;
    ALTER TABLE public.review_snippets DROP COLUMN topics;
  END IF;
END $$;

-- 3) Add / enforce CHECK constraints
update public.tools
set pricing_model = 'Unknown'
where pricing_model is not null
  and pricing_model not in ('Free', 'Free trial', 'Paid', 'Freemium', 'Unknown');

alter table public.tools drop constraint if exists tools_pricing_model_valid;
alter table public.tools
  add constraint tools_pricing_model_valid
  check (pricing_model in ('Free', 'Free trial', 'Paid', 'Freemium', 'Unknown'));

update public.deals
set offer_type = 'Unknown'
where offer_type is not null
  and offer_type not in ('Code', 'Link', 'Trial extension', 'Credit bonus', 'Unknown');

alter table public.deals drop constraint if exists deals_offer_type_valid;
alter table public.deals
  add constraint deals_offer_type_valid
  check (offer_type in ('Code', 'Link', 'Trial extension', 'Credit bonus', 'Unknown'));

-- 4) Fix nullability required by UI
update public.tools set short_tagline = '' where short_tagline is null;
update public.tools set logo_url = '' where logo_url is null;
update public.tools set website_url = '' where website_url is null;

alter table public.tools alter column short_tagline set not null;
alter table public.tools alter column logo_url set not null;
alter table public.tools alter column website_url set not null;

-- deals.category required by UI
update public.deals d
set category = coalesce(
  (
    select array_agg(distinct c.name order by c.name)
    from public.tool_categories tc
    join public.categories c on c.id = tc.category_id
    where tc.tool_id = d.tool_id
  ),
  '{}'
)
where d.category is null or cardinality(d.category) = 0;

update public.deals set category = '{}' where category is null;
alter table public.deals alter column category set default '{}';
alter table public.deals alter column category set not null;

-- 5) RLS policy for report submissions
drop policy if exists "Public create reports" on public.reports;
drop policy if exists "Anyone can submit" on public.reports;
create policy "Anyone can submit"
on public.reports
for insert
to anon, authenticated
with check (true);

grant usage on schema public to anon, authenticated;
grant insert on table public.reports to anon, authenticated;

-- 6) RPC functions
create or replace function public.get_category_counts()
returns table (category_id uuid, name text, slug text, tool_count bigint, deal_count bigint)
language sql stable as $$
  select
    c.id,
    c.name,
    c.slug,
    (select count(*) from public.tool_categories tc where tc.category_id = c.id),
    (select count(*)
      from public.deals d
      join public.tool_categories tc on tc.tool_id = d.tool_id
      where tc.category_id = c.id)
  from public.categories c
  order by c.name;
$$;

create or replace function public.get_tool_detail(p_slug text)
returns json language sql stable as $$
  select json_build_object(
    'tool', (select row_to_json(t) from public.tools t where t.slug = p_slug),
    'review_count', (select count(*) from public.review_snippets r join public.tools t on t.id = r.tool_id where t.slug = p_slug),
    'deal_count', (select count(*) from public.deals d join public.tools t on t.id = d.tool_id where t.slug = p_slug)
  );
$$;

create or replace function public.search_all(q text)
returns json language sql stable as $$
  select json_build_object(
    'tools', (select coalesce(json_agg(t), '[]'::json) from public.tools t
              where t.name ilike '%' || q || '%'
                 or t.short_tagline ilike '%' || q || '%'),
    'deals', (select coalesce(json_agg(row_to_json(d)), '[]'::json)
              from public.deals d
              join public.tools t on t.id = d.tool_id
              where d.offer_text ilike '%' || q || '%'
                 or d.code ilike '%' || q || '%'
                 or t.name ilike '%' || q || '%')
  );
$$;

-- 7) Seed categories required by UI
insert into public.categories (name, slug) values
  ('Repurposing', 'repurposing'),
  ('UGC Avatars', 'ugc-avatars'),
  ('Captions', 'captions'),
  ('Scripts/Hooks', 'scripts-hooks'),
  ('Video Gen/B-roll', 'video-gen-b-roll'),
  ('Dubbing/Voice', 'dubbing-voice')
on conflict do nothing;

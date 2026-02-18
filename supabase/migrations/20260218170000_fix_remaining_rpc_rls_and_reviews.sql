-- Final pre-UI integration fixes:
-- 1) add missing RPCs
-- 2) ensure anon report insert policy
-- 3) fill sentiment gaps in reviews

-- 1) Missing RPC functions
create or replace function public.get_tools_by_category(p_slug text)
returns setof public.tools
language sql
stable
as $$
  select distinct t.*
  from public.tools t
  join public.tool_categories tc on tc.tool_id = t.id
  join public.categories c on c.id = tc.category_id
  where c.slug = p_slug
  order by t.name;
$$;

create or replace function public.get_deals_by_category(p_slug text)
returns setof public.deals
language sql
stable
as $$
  select distinct d.*
  from public.deals d
  join public.tool_categories tc on tc.tool_id = d.tool_id
  join public.categories c on c.id = tc.category_id
  where c.slug = p_slug
    and d.active = true
  order by d.last_seen desc;
$$;

-- 2) Ensure anon INSERT policy exists on reports
-- (idempotent recreation)
drop policy if exists "Anyone can submit" on public.reports;
create policy "Anyone can submit"
on public.reports
for insert
to anon, authenticated
with check (true);

-- 3) Add targeted review sentiment coverage
-- Requested additions:
-- - CapCut: Neutral (and add Con to satisfy all-3-sentiments requirement)
-- - OpusClip: Neutral
-- - HeyGen: Con
-- - Descript: Neutral
with review_seed (
  id, tool_slug, youtube_video_id, channel_name, video_title, publish_date,
  sentiment, tags, snippet_text, receipt_timestamp_seconds
) as (
  values
    ('00000000-0000-0000-0000-000000007001'::uuid, 'capcut', 'D4e5F6g7H8i', 'Primal Video', 'CapCut vs Descript Workflow Breakdown', '2026-02-02'::date, 'Neutral', ARRAY['UI/UX','Speed']::text[], 'CapCut is fast for short-form iterations, but most teams still do final polish elsewhere.', 536),
    ('00000000-0000-0000-0000-000000007002'::uuid, 'capcut', 'Q7r8S9t0U1v', 'Think Media', 'Top Freemium Tools for Ad Testing', '2026-02-15'::date, 'Con', ARRAY['Limits','Export quality']::text[], 'Great starter option, but advanced exports and control can feel limited for scaled campaigns.', 648),
    ('00000000-0000-0000-0000-000000007003'::uuid, 'opus-clip', 'L2m3N4o5P6q', 'Primal Video', 'Riverside + OpusClip Social Pipeline', '2026-02-10'::date, 'Neutral', ARRAY['Speed','Relevance']::text[], 'Strong at finding hooks quickly, though teams often tune clip boundaries before publishing.', 468),
    ('00000000-0000-0000-0000-000000007004'::uuid, 'heygen', 'E5f6G7h8I9j', 'Futurepedia', 'HeyGen and Synthesia for Product Demos', '2026-01-30'::date, 'Con', ARRAY['Pricing','Limits']::text[], 'Output quality is high, but rendering at scale can become expensive for smaller teams.', 572),
    ('00000000-0000-0000-0000-000000007005'::uuid, 'descript', 'D4e5F6g7H8i', 'Primal Video', 'CapCut vs Descript Workflow Breakdown', '2026-02-02'::date, 'Neutral', ARRAY['UI/UX','Integrations']::text[], 'Excellent text-based editing workflow, though final output needs review for heavier creative edits.', 459)
)
insert into public.review_snippets (
  id,
  tool_id,
  video_id,
  channel_name,
  video_title,
  publish_date,
  sentiment,
  tags,
  snippet_text,
  receipt_url,
  receipt_timestamp_seconds,
  sponsored_flag
)
select
  s.id,
  t.id,
  yv.id,
  s.channel_name,
  s.video_title,
  s.publish_date,
  s.sentiment,
  s.tags,
  s.snippet_text,
  'https://www.youtube.com/watch?v=' || s.youtube_video_id || '&t=' || s.receipt_timestamp_seconds::text || 's',
  s.receipt_timestamp_seconds,
  false
from review_seed s
join public.tools t on t.slug = s.tool_slug
join public.youtube_videos yv on yv.youtube_video_id = s.youtube_video_id
on conflict (id) do update set
  tool_id = excluded.tool_id,
  video_id = excluded.video_id,
  channel_name = excluded.channel_name,
  video_title = excluded.video_title,
  publish_date = excluded.publish_date,
  sentiment = excluded.sentiment,
  tags = excluded.tags,
  snippet_text = excluded.snippet_text,
  receipt_url = excluded.receipt_url,
  receipt_timestamp_seconds = excluded.receipt_timestamp_seconds,
  sponsored_flag = excluded.sponsored_flag;

update public.tools t
set last_seen_review_date = r.max_publish_date
from (
  select tool_id, max(publish_date) as max_publish_date
  from public.review_snippets
  group by tool_id
) r
where r.tool_id = t.id;

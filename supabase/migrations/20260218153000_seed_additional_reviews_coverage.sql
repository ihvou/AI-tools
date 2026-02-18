-- Add review coverage for remaining seeded tools so frontend detail pages feel complete.

with reviews_seed (
  id, tool_slug, youtube_video_id, sentiment, tags, snippet_text,
  receipt_second, channel_name, publish_date, video_title, sponsored_flag
) as (
  values
    ('00000000-0000-0000-0000-000000004019'::uuid, 'canva', 'G7h8I9j0K1l', 'Pro', ARRAY['UI/UX','Speed']::text[], 'Template and resize workflows made multi-platform ad variants easy to ship.', 298, 'AI Growth Hub', '2026-02-05'::date, 'Canva and Adobe Express Ad Variations', false),
    ('00000000-0000-0000-0000-00000000401a'::uuid, 'adobe-express', 'G7h8I9j0K1l', 'Pro', ARRAY['Integrations','Output quality']::text[], 'Brand kit controls kept creatives visually consistent across campaign exports.', 512, 'AI Growth Hub', '2026-02-05'::date, 'Canva and Adobe Express Ad Variations', false),
    ('00000000-0000-0000-0000-00000000401b'::uuid, 'riverside', 'L2m3N4o5P6q', 'Pro', ARRAY['Reliability','Speed']::text[], 'Local recording quality and transcript sync improved post-production flow.', 366, 'Primal Video', '2026-02-10'::date, 'Riverside + OpusClip Social Pipeline', false),
    ('00000000-0000-0000-0000-00000000401c'::uuid, 'kapwing', 'N4o5P6q7R8s', 'Pro', ARRAY['UI/UX','Collaborations']::text[], 'Shared workspaces and subtitle tooling reduced review cycles for social edits.', 287, 'Colin and Samir', '2026-02-12'::date, 'How Teams Scale Creative With Kapwing', false)
)
insert into public.review_snippets (
  id, tool_id, video_id, sentiment, tags, snippet_text,
  receipt_timestamp_seconds, receipt_url, channel_name,
  publish_date, sponsored_flag, video_title
)
select
  rs.id,
  t.id,
  yv.id,
  rs.sentiment,
  rs.tags,
  case when rs.tags @> ARRAY['Collaborations']::text[] then replace(rs.snippet_text, 'Collaborations', 'Integrations') else rs.snippet_text end,
  rs.receipt_second,
  'https://www.youtube.com/watch?v=' || rs.youtube_video_id || '&t=' || rs.receipt_second::text || 's',
  rs.channel_name,
  rs.publish_date,
  rs.sponsored_flag,
  rs.video_title
from reviews_seed rs
join public.tools t on t.slug = rs.tool_slug
join public.youtube_videos yv on yv.youtube_video_id = rs.youtube_video_id
on conflict (id) do update set
  sentiment = excluded.sentiment,
  tags = excluded.tags,
  snippet_text = excluded.snippet_text,
  receipt_timestamp_seconds = excluded.receipt_timestamp_seconds,
  receipt_url = excluded.receipt_url,
  channel_name = excluded.channel_name,
  publish_date = excluded.publish_date,
  sponsored_flag = excluded.sponsored_flag,
  video_title = excluded.video_title;

update public.review_snippets
set tags = array_remove(tags, 'Collaborations')
where tags @> ARRAY['Collaborations']::text[];

update public.review_snippets
set tags = array_append(tags, 'Integrations')
where not (tags @> ARRAY['Integrations']::text[])
  and id = '00000000-0000-0000-0000-00000000401c'::uuid;

update public.tools t
set
  review_sources_count = coalesce(r.review_count, 0),
  last_seen_review_date = r.max_publish_date
from (
  select tool_id, count(*)::int as review_count, max(publish_date) as max_publish_date
  from public.review_snippets
  group by tool_id
) r
where r.tool_id = t.id;

update public.tools
set review_sources_count = 0
where review_sources_count is null;

-- Fix and enrich sample data for UI readiness (data-only migration).
-- No table drops/recreates.

-- 1) Platforms for all tools
update public.tools set platforms = array['Web']::text[] where slug = 'opus-clip';
update public.tools set platforms = array['Web','API']::text[] where slug = 'heygen';
update public.tools set platforms = array['Web','Desktop']::text[] where slug = 'descript';
update public.tools set platforms = array['Web','iOS','Android','Desktop']::text[] where slug = 'capcut';
update public.tools set platforms = array['Web','API']::text[] where slug = 'elevenlabs';
update public.tools set platforms = array['Web']::text[] where slug = 'submagic';
update public.tools set platforms = array['Web']::text[] where slug = 'invideo-ai';
update public.tools set platforms = array['Web']::text[] where slug = 'runway';
update public.tools set platforms = array['Web']::text[] where slug = 'pictory';
update public.tools set platforms = array['Web']::text[] where slug = 'synthesia';
update public.tools set platforms = array['Web']::text[] where slug = 'veed';
update public.tools set platforms = array['Web']::text[] where slug = 'vidyo-ai';
update public.tools set platforms = array['Web','iOS','Android']::text[] where slug = 'canva';
update public.tools set platforms = array['Web','iOS','Android']::text[] where slug = 'adobe-express';
update public.tools set platforms = array['Web','Desktop']::text[] where slug = 'riverside';
update public.tools set platforms = array['Web']::text[] where slug = 'kapwing';

-- 2) Review source counts (realistic discovered-source counts)
update public.tools set review_sources_count = 24 where slug = 'opus-clip';
update public.tools set review_sources_count = 18 where slug = 'heygen';
update public.tools set review_sources_count = 31 where slug = 'descript';
update public.tools set review_sources_count = 42 where slug = 'capcut';
update public.tools set review_sources_count = 27 where slug = 'elevenlabs';
update public.tools set review_sources_count = 15 where slug = 'submagic';
update public.tools set review_sources_count = 22 where slug = 'invideo-ai';
update public.tools set review_sources_count = 19 where slug = 'runway';
update public.tools set review_sources_count = 14 where slug = 'pictory';
update public.tools set review_sources_count = 16 where slug = 'synthesia';
update public.tools set review_sources_count = 20 where slug = 'veed';
update public.tools set review_sources_count = 11 where slug = 'vidyo-ai';
update public.tools set review_sources_count = 28 where slug = 'canva';
update public.tools set review_sources_count = 12 where slug = 'adobe-express';
update public.tools set review_sources_count = 17 where slug = 'riverside';
update public.tools set review_sources_count = 13 where slug = 'kapwing';

-- 3 + 4) Additional review snippets
-- - Add Con + Neutral for: canva, adobe-express, riverside, kapwing
-- - Add one extra for original 2-review tools: vidyo-ai, submagic, elevenlabs, invideo-ai, pictory, runway, synthesia, veed
with review_seed (
  id, tool_slug, youtube_video_id, channel_name, video_title, publish_date,
  sentiment, tags, snippet_text, receipt_timestamp_seconds
) as (
  values
    -- Canva
    ('00000000-0000-0000-0000-000000006001'::uuid, 'canva', 'G7h8I9j0K1l', 'AI Growth Hub', 'Canva and Adobe Express Ad Variations', '2026-02-05'::date, 'Con', ARRAY['Limits','Export quality']::text[], 'Animation controls are convenient, but complex brand motion edits still require heavier tools.', 641),
    ('00000000-0000-0000-0000-000000006002'::uuid, 'canva', 'Q7r8S9t0U1v', 'Think Media', 'Top Freemium Tools for Ad Testing', '2026-02-15'::date, 'Neutral', ARRAY['Pricing','Relevance']::text[], 'Great for fast concepting; teams usually pair it with another editor for final polish.', 452),

    -- Adobe Express
    ('00000000-0000-0000-0000-000000006003'::uuid, 'adobe-express', 'G7h8I9j0K1l', 'AI Growth Hub', 'Canva and Adobe Express Ad Variations', '2026-02-05'::date, 'Con', ARRAY['Limits','Support']::text[], 'Template variety is strong, but advanced timeline-style edits are still limited.', 688),
    ('00000000-0000-0000-0000-000000006004'::uuid, 'adobe-express', 'R8s9T0u1V2w', 'Matt Wolfe', 'Creator Stack 2026: Capture to Distribution', '2026-02-16'::date, 'Neutral', ARRAY['UI/UX','Integrations']::text[], 'Useful for lightweight ad variants, especially if your team already uses Adobe assets.', 515),

    -- Riverside
    ('00000000-0000-0000-0000-000000006005'::uuid, 'riverside', 'L2m3N4o5P6q', 'Primal Video', 'Riverside + OpusClip Social Pipeline', '2026-02-10'::date, 'Con', ARRAY['Reliability','Other']::text[], 'Cloud upload sync can slow down turnaround when recording sessions are very long.', 579),
    ('00000000-0000-0000-0000-000000006006'::uuid, 'riverside', 'M3n4O5p6Q7r', 'Video Marketing Lab', 'Loom to Shorts: Fast Product Update Workflow', '2026-02-11'::date, 'Neutral', ARRAY['Speed','Integrations']::text[], 'Recording quality is strong; editing is best when paired with dedicated post tools.', 433),

    -- Kapwing
    ('00000000-0000-0000-0000-000000006007'::uuid, 'kapwing', 'N4o5P6q7R8s', 'Colin and Samir', 'How Teams Scale Creative With Kapwing', '2026-02-12'::date, 'Con', ARRAY['Pricing','Limits']::text[], 'Collaboration is good, but usage caps can become a bottleneck for high-volume teams.', 534),
    ('00000000-0000-0000-0000-000000006008'::uuid, 'kapwing', 'H8i9J0k1L2m', 'Creator Toolkit', 'Best Caption Tools: VEED, Submagic, Kapwing', '2026-02-06'::date, 'Neutral', ARRAY['UI/UX','Speed']::text[], 'Fast to onboard and publish, though advanced visual workflows remain basic.', 401),

    -- Original tools with only 2 reviews
    ('00000000-0000-0000-0000-000000006009'::uuid, 'vidyo-ai', 'C3d4E5f6G7h', 'Colin and Samir', 'What Creators Use to Repurpose Podcasts', '2026-01-26'::date, 'Neutral', ARRAY['Output quality','Relevance']::text[], 'Good first-pass cliping suggestions; creators still tune cuts before publishing ads.', 346),
    ('00000000-0000-0000-0000-00000000600a'::uuid, 'submagic', 'H8i9J0k1L2m', 'Creator Toolkit', 'Best Caption Tools: VEED, Submagic, Kapwing', '2026-02-06'::date, 'Neutral', ARRAY['UI/UX','Speed']::text[], 'Auto-caption templates are effective, but teams often tweak style for brand consistency.', 258),
    ('00000000-0000-0000-0000-00000000600b'::uuid, 'elevenlabs', 'I9j0K1l2M3n', 'Think Media', 'ElevenLabs Dubbing Quality Test', '2026-02-07'::date, 'Neutral', ARRAY['Output quality','Pricing']::text[], 'Voice quality is strong for ads, with cost depending heavily on localization volume.', 498),
    ('00000000-0000-0000-0000-00000000600c'::uuid, 'invideo-ai', 'J0k1L2m3N4o', 'Matt Wolfe', 'InVideo AI Prompt-to-Video Review', '2026-02-08'::date, 'Con', ARRAY['Reliability','Other']::text[], 'Prompt-based drafts can miss specifics, so production teams still do manual refinement.', 587),
    ('00000000-0000-0000-0000-00000000600d'::uuid, 'pictory', 'K1l2M3n4O5p', 'Futurepedia', 'Pictory for Newsletter-to-Video Funnels', '2026-02-09'::date, 'Con', ARRAY['Export quality','Limits']::text[], 'Great for repurposing, but render quality controls are limited for premium creative.', 521),
    ('00000000-0000-0000-0000-00000000600e'::uuid, 'runway', 'F6g7H8i9J0k', 'Video Marketing Lab', 'Runway Gen-3 for Ad Creative Testing', '2026-02-03'::date, 'Neutral', ARRAY['Output quality','Speed']::text[], 'Useful for rapid concept tests, though ad teams still curate outputs for consistency.', 602),
    ('00000000-0000-0000-0000-00000000600f'::uuid, 'synthesia', 'E5f6G7h8I9j', 'Futurepedia', 'HeyGen and Synthesia for Product Demos', '2026-01-30'::date, 'Neutral', ARRAY['Relevance','Integrations']::text[], 'Reliable for explainers, but message fit depends on script quality and scene design.', 639),
    ('00000000-0000-0000-0000-000000006010'::uuid, 'veed', 'O5p6Q7r8S9t', 'AI Growth Hub', 'Wisecut vs VEED for Talking Head Ads', '2026-02-13'::date, 'Con', ARRAY['Pricing','Export quality']::text[], 'Efficient workflow, but teams can outgrow limits when producing many weekly variants.', 553)
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

-- Keep tool.last_seen_review_date fresh after inserts
update public.tools t
set last_seen_review_date = r.max_publish_date
from (
  select tool_id, max(publish_date) as max_publish_date
  from public.review_snippets
  group by tool_id
) r
where r.tool_id = t.id;

-- 5) Remove verification test row(s)
delete from public.reports where issue_type = 'verification-test';

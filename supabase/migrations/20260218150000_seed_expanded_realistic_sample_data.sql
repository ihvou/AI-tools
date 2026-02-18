-- Seed expanded realistic sample data for frontend integration
-- Adds more records than current mockData.ts (12 tools, 10 deals, 15 reviews)
-- This seed targets: 16 tools, 18 deals, 24 reviews.

-- 1) Tools
with tools_seed (
  id, slug, name, logo_url, website_url, registration_url, short_tagline, pricing_model
) as (
  values
    ('00000000-0000-0000-0000-000000001001'::uuid, 'opus-clip', 'OpusClip', 'https://logo.clearbit.com/opusclip.com', 'https://www.opusclip.com', 'https://www.opusclip.com', 'AI-powered video repurposing for short-form content', 'Freemium'),
    ('00000000-0000-0000-0000-000000001002'::uuid, 'heygen', 'HeyGen', 'https://logo.clearbit.com/heygen.com', 'https://www.heygen.com', 'https://www.heygen.com/pricing', 'AI avatars for marketing and product videos', 'Paid'),
    ('00000000-0000-0000-0000-000000001003'::uuid, 'descript', 'Descript', 'https://logo.clearbit.com/descript.com', 'https://www.descript.com', 'https://www.descript.com/pricing', 'Edit video and audio like a document', 'Freemium'),
    ('00000000-0000-0000-0000-000000001004'::uuid, 'capcut', 'CapCut', 'https://logo.clearbit.com/capcut.com', 'https://www.capcut.com', null, 'Fast editing, auto-captions, and social templates', 'Free'),
    ('00000000-0000-0000-0000-000000001005'::uuid, 'elevenlabs', 'ElevenLabs', 'https://logo.clearbit.com/elevenlabs.io', 'https://www.elevenlabs.io', 'https://www.elevenlabs.io/sign-up', 'AI voiceovers and dubbing for global content', 'Freemium'),
    ('00000000-0000-0000-0000-000000001006'::uuid, 'submagic', 'Submagic', 'https://logo.clearbit.com/submagic.co', 'https://www.submagic.co', 'https://www.submagic.co/pricing', 'Animated captions and highlight styling', 'Paid'),
    ('00000000-0000-0000-0000-000000001007'::uuid, 'invideo-ai', 'InVideo AI', 'https://logo.clearbit.com/invideo.io', 'https://invideo.io', 'https://invideo.io/ai', 'Generate videos from prompts and scripts', 'Freemium'),
    ('00000000-0000-0000-0000-000000001008'::uuid, 'runway', 'Runway', 'https://logo.clearbit.com/runwayml.com', 'https://runwayml.com', 'https://runwayml.com/pricing', 'Advanced AI generation and scene editing', 'Freemium'),
    ('00000000-0000-0000-0000-000000001009'::uuid, 'pictory', 'Pictory', 'https://logo.clearbit.com/pictory.ai', 'https://pictory.ai', 'https://pictory.ai/pricing', 'Turn long content into short video cuts', 'Paid'),
    ('00000000-0000-0000-0000-00000000100a'::uuid, 'synthesia', 'Synthesia', 'https://logo.clearbit.com/synthesia.io', 'https://www.synthesia.io', 'https://www.synthesia.io/pricing', 'Avatar-led videos for training and marketing', 'Paid'),
    ('00000000-0000-0000-0000-00000000100b'::uuid, 'veed', 'VEED', 'https://logo.clearbit.com/veed.io', 'https://www.veed.io', 'https://www.veed.io/pricing', 'Online editor with subtitles and social workflows', 'Freemium'),
    ('00000000-0000-0000-0000-00000000100c'::uuid, 'vidyo-ai', 'vidyo.ai', 'https://logo.clearbit.com/vidyo.ai', 'https://vidyo.ai', 'https://vidyo.ai/pricing', 'Repurpose podcasts and long-form videos into shorts', 'Freemium'),
    ('00000000-0000-0000-0000-00000000100d'::uuid, 'canva', 'Canva', 'https://logo.clearbit.com/canva.com', 'https://www.canva.com', 'https://www.canva.com/pricing', 'Templates, script tools, and quick social exports', 'Freemium'),
    ('00000000-0000-0000-0000-00000000100e'::uuid, 'adobe-express', 'Adobe Express', 'https://logo.clearbit.com/adobe.com', 'https://www.adobe.com/express', 'https://www.adobe.com/express/pricing', 'Quick ad creatives with brand kits and AI assists', 'Freemium'),
    ('00000000-0000-0000-0000-00000000100f'::uuid, 'riverside', 'Riverside', 'https://logo.clearbit.com/riverside.fm', 'https://riverside.fm', 'https://riverside.fm/pricing', 'Record, transcribe, and clip studio-quality videos', 'Freemium'),
    ('00000000-0000-0000-0000-000000001010'::uuid, 'kapwing', 'Kapwing', 'https://logo.clearbit.com/kapwing.com', 'https://www.kapwing.com', 'https://www.kapwing.com/pricing', 'Collaborative browser editor with auto-subtitles', 'Freemium')
)
insert into public.tools (
  id, slug, name, logo_url, website_url, registration_url,
  short_tagline, pricing_model, review_sources_count
)
select
  id, slug, name, logo_url, website_url, registration_url,
  short_tagline, pricing_model, 0
from tools_seed
on conflict (slug) do update set
  name = excluded.name,
  logo_url = excluded.logo_url,
  website_url = excluded.website_url,
  registration_url = excluded.registration_url,
  short_tagline = excluded.short_tagline,
  pricing_model = excluded.pricing_model;

-- 2) Tool-category links
with tool_category_seed (tool_slug, category_name) as (
  values
    ('opus-clip', 'Repurposing'), ('opus-clip', 'Captions'),
    ('heygen', 'UGC Avatars'), ('heygen', 'Video Gen/B-roll'),
    ('descript', 'Repurposing'), ('descript', 'Captions'), ('descript', 'Dubbing/Voice'),
    ('capcut', 'Repurposing'), ('capcut', 'Captions'),
    ('elevenlabs', 'Dubbing/Voice'),
    ('submagic', 'Captions'),
    ('invideo-ai', 'Video Gen/B-roll'), ('invideo-ai', 'Scripts/Hooks'),
    ('runway', 'Video Gen/B-roll'),
    ('pictory', 'Video Gen/B-roll'), ('pictory', 'Scripts/Hooks'),
    ('synthesia', 'UGC Avatars'), ('synthesia', 'Video Gen/B-roll'),
    ('veed', 'Repurposing'), ('veed', 'Captions'),
    ('vidyo-ai', 'Repurposing'),
    ('canva', 'Scripts/Hooks'), ('canva', 'Video Gen/B-roll'),
    ('adobe-express', 'Repurposing'), ('adobe-express', 'Scripts/Hooks'),
    ('riverside', 'Repurposing'), ('riverside', 'Captions'),
    ('kapwing', 'Repurposing'), ('kapwing', 'Captions')
)
insert into public.tool_categories (tool_id, category_id)
select t.id, c.id
from tool_category_seed s
join public.tools t on t.slug = s.tool_slug
join public.categories c on c.name = s.category_name
on conflict do nothing;

-- 3) YouTube channels
with channels_seed (id, youtube_channel_id, name, handle, channel_url) as (
  values
    ('00000000-0000-0000-0000-000000002001'::uuid, 'UCtmY49Zn4l0RMJnTWfV5L5Q', 'Think Media', '@ThinkMediaTV', 'https://www.youtube.com/@ThinkMediaTV'),
    ('00000000-0000-0000-0000-000000002002'::uuid, 'UCiT9RITQ9PW6BhXK0y2jaeg', 'Matt Wolfe', '@mreflow', 'https://www.youtube.com/@mreflow'),
    ('00000000-0000-0000-0000-000000002003'::uuid, 'UCoOae5nYA7VqaXzerajD0lg', 'Colin and Samir', '@ColinandSamir', 'https://www.youtube.com/@ColinandSamir'),
    ('00000000-0000-0000-0000-000000002004'::uuid, 'UCn4XQ9T5D7AqYJ95Q0M6fYQ', 'Primal Video', '@PrimalVideo', 'https://www.youtube.com/@PrimalVideo'),
    ('00000000-0000-0000-0000-000000002005'::uuid, 'UCkWQ0gDrqOCarmUKmppD7GQ', 'Futurepedia', '@Futurepedia', 'https://www.youtube.com/@Futurepedia'),
    ('00000000-0000-0000-0000-000000002006'::uuid, 'UCx8sQmM8xVfU9m8WcF2MxkA', 'Creator Toolkit', '@CreatorToolkit', 'https://www.youtube.com/@CreatorToolkit'),
    ('00000000-0000-0000-0000-000000002007'::uuid, 'UC3KQ5gwMqoP4F3l7h3R1L2A', 'Video Marketing Lab', '@VideoMarketingLab', 'https://www.youtube.com/@VideoMarketingLab'),
    ('00000000-0000-0000-0000-000000002008'::uuid, 'UC5fM8sAC5M6hQ9Qb7Qv9B2Q', 'AI Growth Hub', '@AIGrowthHub', 'https://www.youtube.com/@AIGrowthHub')
)
insert into public.youtube_channels (id, youtube_channel_id, name, handle, channel_url)
select id, youtube_channel_id, name, handle, channel_url from channels_seed
on conflict (youtube_channel_id) do update set
  name = excluded.name,
  handle = excluded.handle,
  channel_url = excluded.channel_url;

-- 4) YouTube videos
with videos_seed (id, youtube_video_id, channel_youtube_id, title, published_at) as (
  values
    ('00000000-0000-0000-0000-000000003001'::uuid, 'A1b2C3d4E5f', 'UCtmY49Zn4l0RMJnTWfV5L5Q', 'Best AI Video Tools for Short-Form in 2026', '2026-01-12T10:00:00Z'::timestamptz),
    ('00000000-0000-0000-0000-000000003002'::uuid, 'B2c3D4e5F6g', 'UCiT9RITQ9PW6BhXK0y2jaeg', 'I Tested 10 AI Editing Apps for Ads', '2026-01-20T15:30:00Z'::timestamptz),
    ('00000000-0000-0000-0000-000000003003'::uuid, 'C3d4E5f6G7h', 'UCoOae5nYA7VqaXzerajD0lg', 'What Creators Use to Repurpose Podcasts', '2026-01-26T09:15:00Z'::timestamptz),
    ('00000000-0000-0000-0000-000000003004'::uuid, 'D4e5F6g7H8i', 'UCn4XQ9T5D7AqYJ95Q0M6fYQ', 'CapCut vs Descript Workflow Breakdown', '2026-02-02T12:00:00Z'::timestamptz),
    ('00000000-0000-0000-0000-000000003005'::uuid, 'E5f6G7h8I9j', 'UCkWQ0gDrqOCarmUKmppD7GQ', 'HeyGen and Synthesia for Product Demos', '2026-01-30T14:20:00Z'::timestamptz),
    ('00000000-0000-0000-0000-000000003006'::uuid, 'F6g7H8i9J0k', 'UC3KQ5gwMqoP4F3l7h3R1L2A', 'Runway Gen-3 for Ad Creative Testing', '2026-02-03T16:40:00Z'::timestamptz),
    ('00000000-0000-0000-0000-000000003007'::uuid, 'G7h8I9j0K1l', 'UC5fM8sAC5M6hQ9Qb7Qv9B2Q', 'Canva and Adobe Express Ad Variations', '2026-02-05T11:05:00Z'::timestamptz),
    ('00000000-0000-0000-0000-000000003008'::uuid, 'H8i9J0k1L2m', 'UCx8sQmM8xVfU9m8WcF2MxkA', 'Best Caption Tools: VEED, Submagic, Kapwing', '2026-02-06T18:10:00Z'::timestamptz),
    ('00000000-0000-0000-0000-000000003009'::uuid, 'I9j0K1l2M3n', 'UCtmY49Zn4l0RMJnTWfV5L5Q', 'ElevenLabs Dubbing Quality Test', '2026-02-07T09:55:00Z'::timestamptz),
    ('00000000-0000-0000-0000-00000000300a'::uuid, 'J0k1L2m3N4o', 'UCiT9RITQ9PW6BhXK0y2jaeg', 'InVideo AI Prompt-to-Video Review', '2026-02-08T13:22:00Z'::timestamptz),
    ('00000000-0000-0000-0000-00000000300b'::uuid, 'K1l2M3n4O5p', 'UCkWQ0gDrqOCarmUKmppD7GQ', 'Pictory for Newsletter-to-Video Funnels', '2026-02-09T19:30:00Z'::timestamptz),
    ('00000000-0000-0000-0000-00000000300c'::uuid, 'L2m3N4o5P6q', 'UCn4XQ9T5D7AqYJ95Q0M6fYQ', 'Riverside + OpusClip Social Pipeline', '2026-02-10T08:40:00Z'::timestamptz),
    ('00000000-0000-0000-0000-00000000300d'::uuid, 'M3n4O5p6Q7r', 'UC3KQ5gwMqoP4F3l7h3R1L2A', 'Loom to Shorts: Fast Product Update Workflow', '2026-02-11T17:05:00Z'::timestamptz),
    ('00000000-0000-0000-0000-00000000300e'::uuid, 'N4o5P6q7R8s', 'UCoOae5nYA7VqaXzerajD0lg', 'How Teams Scale Creative With Kapwing', '2026-02-12T10:20:00Z'::timestamptz),
    ('00000000-0000-0000-0000-00000000300f'::uuid, 'O5p6Q7r8S9t', 'UC5fM8sAC5M6hQ9Qb7Qv9B2Q', 'Wisecut vs VEED for Talking Head Ads', '2026-02-13T14:10:00Z'::timestamptz),
    ('00000000-0000-0000-0000-000000003010'::uuid, 'P6q7R8s9T0u', 'UCx8sQmM8xVfU9m8WcF2MxkA', 'Runway + HeyGen Hybrid Creative Process', '2026-02-14T12:15:00Z'::timestamptz),
    ('00000000-0000-0000-0000-000000003011'::uuid, 'Q7r8S9t0U1v', 'UCtmY49Zn4l0RMJnTWfV5L5Q', 'Top Freemium Tools for Ad Testing', '2026-02-15T09:45:00Z'::timestamptz),
    ('00000000-0000-0000-0000-000000003012'::uuid, 'R8s9T0u1V2w', 'UCiT9RITQ9PW6BhXK0y2jaeg', 'Creator Stack 2026: Capture to Distribution', '2026-02-16T16:25:00Z'::timestamptz)
)
insert into public.youtube_videos (id, youtube_video_id, channel_id, title, video_url, published_at)
select
  v.id,
  v.youtube_video_id,
  yc.id,
  v.title,
  'https://www.youtube.com/watch?v=' || v.youtube_video_id,
  v.published_at
from videos_seed v
join public.youtube_channels yc on yc.youtube_channel_id = v.channel_youtube_id
on conflict (youtube_video_id) do update set
  title = excluded.title,
  video_url = excluded.video_url,
  published_at = excluded.published_at,
  channel_id = excluded.channel_id;

-- 5) Reviews (24)
with reviews_seed (
  id, tool_slug, youtube_video_id, sentiment, tags, snippet_text,
  receipt_second, channel_name, publish_date, video_title, sponsored_flag
) as (
  values
    ('00000000-0000-0000-0000-000000004001'::uuid, 'opus-clip', 'A1b2C3d4E5f', 'Pro', ARRAY['Speed','Output quality']::text[], 'Clip detection found strong hooks quickly and reduced manual timeline work.', 342, 'Think Media', '2026-01-12'::date, 'Best AI Video Tools for Short-Form in 2026', false),
    ('00000000-0000-0000-0000-000000004002'::uuid, 'opus-clip', 'L2m3N4o5P6q', 'Con', ARRAY['Pricing','Limits']::text[], 'Usage limits on lower tiers can be restrictive for daily posting teams.', 511, 'Primal Video', '2026-02-10'::date, 'Riverside + OpusClip Social Pipeline', false),

    ('00000000-0000-0000-0000-000000004003'::uuid, 'heygen', 'E5f6G7h8I9j', 'Pro', ARRAY['Output quality','Relevance']::text[], 'Avatar lip-sync and pacing looked credible for explainer ads.', 287, 'Futurepedia', '2026-01-30'::date, 'HeyGen and Synthesia for Product Demos', true),
    ('00000000-0000-0000-0000-000000004004'::uuid, 'heygen', 'P6q7R8s9T0u', 'Neutral', ARRAY['Pricing','Integrations']::text[], 'Strong results, but teams should budget for higher-volume rendering.', 420, 'Creator Toolkit', '2026-02-14'::date, 'Runway + HeyGen Hybrid Creative Process', false),

    ('00000000-0000-0000-0000-000000004005'::uuid, 'descript', 'D4e5F6g7H8i', 'Pro', ARRAY['UI/UX','Speed']::text[], 'Text-based editing cut rough edit time substantially in this workflow.', 198, 'Primal Video', '2026-02-02'::date, 'CapCut vs Descript Workflow Breakdown', false),
    ('00000000-0000-0000-0000-000000004006'::uuid, 'descript', 'Q7r8S9t0U1v', 'Con', ARRAY['Export quality']::text[], 'Long export jobs were slower than desktop NLE workflows.', 604, 'Think Media', '2026-02-15'::date, 'Top Freemium Tools for Ad Testing', false),

    ('00000000-0000-0000-0000-000000004007'::uuid, 'capcut', 'D4e5F6g7H8i', 'Pro', ARRAY['Pricing','UI/UX']::text[], 'The free plan plus fast templates made rapid creative testing practical.', 455, 'Primal Video', '2026-02-02'::date, 'CapCut vs Descript Workflow Breakdown', false),
    ('00000000-0000-0000-0000-000000004008'::uuid, 'capcut', 'Q7r8S9t0U1v', 'Neutral', ARRAY['Watermark','Limits']::text[], 'Some advanced assets are gated unless you are on paid options.', 331, 'Think Media', '2026-02-15'::date, 'Top Freemium Tools for Ad Testing', false),

    ('00000000-0000-0000-0000-000000004009'::uuid, 'elevenlabs', 'I9j0K1l2M3n', 'Pro', ARRAY['Output quality','Relevance']::text[], 'Voice timbre held up well across short ad reads and hooks.', 366, 'Think Media', '2026-02-07'::date, 'ElevenLabs Dubbing Quality Test', false),
    ('00000000-0000-0000-0000-00000000400a'::uuid, 'elevenlabs', 'R8s9T0u1V2w', 'Con', ARRAY['Pricing','Limits']::text[], 'Character caps can run out quickly with high weekly output.', 274, 'Matt Wolfe', '2026-02-16'::date, 'Creator Stack 2026: Capture to Distribution', false),

    ('00000000-0000-0000-0000-00000000400b'::uuid, 'submagic', 'H8i9J0k1L2m', 'Pro', ARRAY['Speed','Output quality']::text[], 'Auto-styled captions were production-ready with minimal tweaks.', 212, 'Creator Toolkit', '2026-02-06'::date, 'Best Caption Tools: VEED, Submagic, Kapwing', false),
    ('00000000-0000-0000-0000-00000000400c'::uuid, 'submagic', 'O5p6Q7r8S9t', 'Con', ARRAY['Pricing']::text[], 'No long free runway for teams evaluating at larger weekly volume.', 498, 'AI Growth Hub', '2026-02-13'::date, 'Wisecut vs VEED for Talking Head Ads', false),

    ('00000000-0000-0000-0000-00000000400d'::uuid, 'invideo-ai', 'J0k1L2m3N4o', 'Pro', ARRAY['Relevance','UI/UX']::text[], 'Prompt-to-video drafts were good starting points for ad variants.', 305, 'Matt Wolfe', '2026-02-08'::date, 'InVideo AI Prompt-to-Video Review', true),
    ('00000000-0000-0000-0000-00000000400e'::uuid, 'invideo-ai', 'R8s9T0u1V2w', 'Neutral', ARRAY['Output quality']::text[], 'Output quality improves noticeably when scripts are tightly scoped.', 542, 'Matt Wolfe', '2026-02-16'::date, 'Creator Stack 2026: Capture to Distribution', false),

    ('00000000-0000-0000-0000-00000000400f'::uuid, 'runway', 'F6g7H8i9J0k', 'Pro', ARRAY['Output quality','Speed']::text[], 'Generation controls made iterative ad visual testing much faster.', 389, 'Video Marketing Lab', '2026-02-03'::date, 'Runway Gen-3 for Ad Creative Testing', false),
    ('00000000-0000-0000-0000-000000004010'::uuid, 'runway', 'P6q7R8s9T0u', 'Con', ARRAY['Pricing']::text[], 'Heavy experimentation can increase credit spend quickly.', 268, 'Creator Toolkit', '2026-02-14'::date, 'Runway + HeyGen Hybrid Creative Process', false),

    ('00000000-0000-0000-0000-000000004011'::uuid, 'pictory', 'K1l2M3n4O5p', 'Pro', ARRAY['Relevance','Integrations']::text[], 'Script and blog repurposing worked well for top-of-funnel video ads.', 314, 'Futurepedia', '2026-02-09'::date, 'Pictory for Newsletter-to-Video Funnels', false),
    ('00000000-0000-0000-0000-000000004012'::uuid, 'pictory', 'Q7r8S9t0U1v', 'Neutral', ARRAY['UI/UX']::text[], 'Workflow is straightforward, but brand polish still needs manual passes.', 476, 'Think Media', '2026-02-15'::date, 'Top Freemium Tools for Ad Testing', false),

    ('00000000-0000-0000-0000-000000004013'::uuid, 'synthesia', 'E5f6G7h8I9j', 'Pro', ARRAY['Output quality','Reliability']::text[], 'Avatar consistency was solid across multiple script revisions.', 501, 'Futurepedia', '2026-01-30'::date, 'HeyGen and Synthesia for Product Demos', true),
    ('00000000-0000-0000-0000-000000004014'::uuid, 'synthesia', 'P6q7R8s9T0u', 'Con', ARRAY['Pricing']::text[], 'Costs rise when teams need many language/localization variants.', 603, 'Creator Toolkit', '2026-02-14'::date, 'Runway + HeyGen Hybrid Creative Process', false),

    ('00000000-0000-0000-0000-000000004015'::uuid, 'veed', 'H8i9J0k1L2m', 'Pro', ARRAY['UI/UX','Speed']::text[], 'Subtitle editing was quick and intuitive for social ad formats.', 155, 'Creator Toolkit', '2026-02-06'::date, 'Best Caption Tools: VEED, Submagic, Kapwing', false),
    ('00000000-0000-0000-0000-000000004016'::uuid, 'veed', 'O5p6Q7r8S9t', 'Neutral', ARRAY['Export quality']::text[], 'Great for fast drafts; some teams still finalize in heavier editors.', 367, 'AI Growth Hub', '2026-02-13'::date, 'Wisecut vs VEED for Talking Head Ads', false),

    ('00000000-0000-0000-0000-000000004017'::uuid, 'vidyo-ai', 'C3d4E5f6G7h', 'Pro', ARRAY['Speed','Relevance']::text[], 'Short clip suggestions captured the core moments from longer episodes.', 248, 'Colin and Samir', '2026-01-26'::date, 'What Creators Use to Repurpose Podcasts', false),
    ('00000000-0000-0000-0000-000000004018'::uuid, 'vidyo-ai', 'M3n4O5p6Q7r', 'Con', ARRAY['Limits']::text[], 'Generated framing occasionally misses context and needs manual cleanup.', 522, 'Video Marketing Lab', '2026-02-11'::date, 'Loom to Shorts: Fast Product Update Workflow', false)
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
  rs.snippet_text,
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

-- 6) Deals (18)
with deals_seed (
  id, tool_slug, youtube_video_id, offer_text, offer_type, code, link_url, receipt_second, last_seen
) as (
  values
    ('00000000-0000-0000-0000-000000005001'::uuid, 'opus-clip', 'A1b2C3d4E5f', '30% off annual plan', 'Code', 'CREATOR30', null, 722, '2026-02-15T00:00:00Z'::timestamptz),
    ('00000000-0000-0000-0000-000000005002'::uuid, 'opus-clip', 'L2m3N4o5P6q', 'Extended 14-day trial', 'Trial extension', null, 'https://www.opusclip.com/pricing', 654, '2026-02-16T00:00:00Z'::timestamptz),
    ('00000000-0000-0000-0000-000000005003'::uuid, 'heygen', 'E5f6G7h8I9j', '2 months free on annual subscription', 'Link', null, 'https://www.heygen.com', 590, '2026-02-14T00:00:00Z'::timestamptz),
    ('00000000-0000-0000-0000-000000005004'::uuid, 'descript', 'D4e5F6g7H8i', '20% off creator plan', 'Code', 'EDIT20', null, 688, '2026-02-13T00:00:00Z'::timestamptz),
    ('00000000-0000-0000-0000-000000005005'::uuid, 'capcut', 'Q7r8S9t0U1v', 'Free assets pack for new users', 'Credit bonus', null, 'https://www.capcut.com', 411, '2026-02-16T00:00:00Z'::timestamptz),
    ('00000000-0000-0000-0000-000000005006'::uuid, 'elevenlabs', 'I9j0K1l2M3n', '10,000 bonus characters first month', 'Credit bonus', 'VOICE10K', null, 709, '2026-02-15T00:00:00Z'::timestamptz),
    ('00000000-0000-0000-0000-000000005007'::uuid, 'submagic', 'H8i9J0k1L2m', '20% off any annual plan', 'Code', 'CAPTION20', null, 534, '2026-02-12T00:00:00Z'::timestamptz),
    ('00000000-0000-0000-0000-000000005008'::uuid, 'invideo-ai', 'J0k1L2m3N4o', '25% off first 3 months', 'Code', 'VIDEO25', null, 632, '2026-02-16T00:00:00Z'::timestamptz),
    ('00000000-0000-0000-0000-000000005009'::uuid, 'runway', 'F6g7H8i9J0k', '40% off first month', 'Code', 'RUNWAY40', null, 780, '2026-02-11T00:00:00Z'::timestamptz),
    ('00000000-0000-0000-0000-00000000500a'::uuid, 'pictory', 'K1l2M3n4O5p', '15% off annual subscription', 'Code', 'SAVE15', null, 477, '2026-02-10T00:00:00Z'::timestamptz),
    ('00000000-0000-0000-0000-00000000500b'::uuid, 'synthesia', 'E5f6G7h8I9j', 'Free avatar customization credit', 'Credit bonus', null, 'https://www.synthesia.io/pricing', 744, '2026-02-14T00:00:00Z'::timestamptz),
    ('00000000-0000-0000-0000-00000000500c'::uuid, 'veed', 'H8i9J0k1L2m', 'Extended 30-day trial', 'Trial extension', null, 'https://www.veed.io', 681, '2026-02-15T00:00:00Z'::timestamptz),
    ('00000000-0000-0000-0000-00000000500d'::uuid, 'vidyo-ai', 'C3d4E5f6G7h', '3 months at 50% off starter', 'Code', 'SHORTS50', null, 569, '2026-02-09T00:00:00Z'::timestamptz),
    ('00000000-0000-0000-0000-00000000500e'::uuid, 'canva', 'G7h8I9j0K1l', 'Canva Pro free trial extension', 'Trial extension', null, 'https://www.canva.com/pricing', 523, '2026-02-16T00:00:00Z'::timestamptz),
    ('00000000-0000-0000-0000-00000000500f'::uuid, 'adobe-express', 'G7h8I9j0K1l', 'Free premium templates bundle', 'Credit bonus', null, 'https://www.adobe.com/express', 608, '2026-02-16T00:00:00Z'::timestamptz),
    ('00000000-0000-0000-0000-000000005010'::uuid, 'riverside', 'L2m3N4o5P6q', '25% off annual recording plan', 'Code', 'RIVER25', null, 492, '2026-02-15T00:00:00Z'::timestamptz),
    ('00000000-0000-0000-0000-000000005011'::uuid, 'kapwing', 'H8i9J0k1L2m', '20% off team workspace', 'Code', 'TEAM20', null, 736, '2026-02-14T00:00:00Z'::timestamptz),
    ('00000000-0000-0000-0000-000000005012'::uuid, 'kapwing', 'N4o5P6q7R8s', 'Extra 5 export credits', 'Credit bonus', null, 'https://www.kapwing.com/pricing', 443, '2026-02-16T00:00:00Z'::timestamptz)
)
insert into public.deals (
  id, tool_id, video_id, offer_text, offer_type, code, link_url,
  receipt_timestamp_seconds, receipt_url, last_seen, category
)
select
  ds.id,
  t.id,
  yv.id,
  ds.offer_text,
  ds.offer_type,
  ds.code,
  ds.link_url,
  ds.receipt_second,
  'https://www.youtube.com/watch?v=' || ds.youtube_video_id || '&t=' || ds.receipt_second::text || 's',
  ds.last_seen,
  coalesce(
    (
      select array_agg(c.name order by c.name)
      from public.tool_categories tc
      join public.categories c on c.id = tc.category_id
      where tc.tool_id = t.id
    ),
    '{}'
  )
from deals_seed ds
join public.tools t on t.slug = ds.tool_slug
join public.youtube_videos yv on yv.youtube_video_id = ds.youtube_video_id
on conflict (id) do update set
  offer_text = excluded.offer_text,
  offer_type = excluded.offer_type,
  code = excluded.code,
  link_url = excluded.link_url,
  receipt_timestamp_seconds = excluded.receipt_timestamp_seconds,
  receipt_url = excluded.receipt_url,
  last_seen = excluded.last_seen,
  category = excluded.category,
  tool_id = excluded.tool_id,
  video_id = excluded.video_id;

-- 7) Sync aggregate fields used by frontend
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

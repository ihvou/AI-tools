-- Initial Supabase schema for AI Video Ads Hub
-- Based on docs/product/03-tech-architecture.md

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.tools (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  short_tagline text,
  logo_url text,
  official_url text,
  pricing_model text,
  review_sources_count integer not null default 0,
  platforms text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tools_review_sources_count_non_negative check (review_sources_count >= 0)
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.tool_categories (
  tool_id uuid not null references public.tools(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (tool_id, category_id)
);

create table if not exists public.youtube_channels (
  id uuid primary key default gen_random_uuid(),
  youtube_channel_id text unique,
  name text not null,
  handle text,
  channel_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.youtube_videos (
  id uuid primary key default gen_random_uuid(),
  youtube_video_id text not null unique,
  channel_id uuid references public.youtube_channels(id) on delete set null,
  title text not null,
  description text,
  video_url text,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.video_mentions (
  id uuid primary key default gen_random_uuid(),
  tool_id uuid not null references public.tools(id) on delete cascade,
  video_id uuid not null references public.youtube_videos(id) on delete cascade,
  mention_count integer not null default 1,
  first_mentioned_second integer,
  last_mentioned_second integer,
  extraction_confidence numeric(4,3),
  created_at timestamptz not null default now(),
  constraint video_mentions_mention_count_positive check (mention_count > 0),
  constraint video_mentions_first_second_non_negative check (first_mentioned_second is null or first_mentioned_second >= 0),
  constraint video_mentions_last_second_non_negative check (last_mentioned_second is null or last_mentioned_second >= 0),
  constraint video_mentions_time_order check (
    first_mentioned_second is null
    or last_mentioned_second is null
    or first_mentioned_second <= last_mentioned_second
  ),
  constraint video_mentions_confidence_range check (extraction_confidence is null or (extraction_confidence >= 0 and extraction_confidence <= 1)),
  unique (tool_id, video_id, first_mentioned_second)
);

create table if not exists public.review_snippets (
  id uuid primary key default gen_random_uuid(),
  tool_id uuid not null references public.tools(id) on delete cascade,
  video_id uuid not null references public.youtube_videos(id) on delete cascade,
  sentiment text not null,
  topics text[] not null default '{}',
  quote text not null,
  receipt_timestamp_seconds integer not null,
  receipt_url text not null,
  channel_name text,
  publish_date date,
  extraction_confidence numeric(4,3),
  created_at timestamptz not null default now(),
  constraint review_snippets_sentiment_valid check (sentiment in ('Pro', 'Con', 'Neutral')),
  constraint review_snippets_receipt_second_non_negative check (receipt_timestamp_seconds >= 0),
  constraint review_snippets_confidence_range check (extraction_confidence is null or (extraction_confidence >= 0 and extraction_confidence <= 1)),
  unique (tool_id, video_id, receipt_timestamp_seconds, quote)
);

create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  tool_id uuid not null references public.tools(id) on delete cascade,
  video_id uuid references public.youtube_videos(id) on delete set null,
  offer_text text not null,
  offer_type text,
  code text,
  link_url text,
  receipt_timestamp_seconds integer,
  receipt_url text not null,
  active boolean not null default true,
  last_seen timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint deals_receipt_second_non_negative check (receipt_timestamp_seconds is null or receipt_timestamp_seconds >= 0)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  report_type text not null,
  entity_id uuid not null,
  issue_type text not null,
  notes text,
  reporter_fingerprint text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  constraint reports_type_valid check (report_type in ('review', 'deal')),
  constraint reports_status_valid check (status in ('open', 'triaged', 'resolved', 'dismissed'))
);

create index if not exists idx_tools_name on public.tools(name);
create index if not exists idx_tools_pricing_model on public.tools(pricing_model);
create index if not exists idx_tool_categories_category_id on public.tool_categories(category_id);
create index if not exists idx_youtube_videos_channel_id on public.youtube_videos(channel_id);
create index if not exists idx_youtube_videos_published_at on public.youtube_videos(published_at desc);
create index if not exists idx_video_mentions_tool_id on public.video_mentions(tool_id);
create index if not exists idx_video_mentions_video_id on public.video_mentions(video_id);
create index if not exists idx_review_snippets_tool_id on public.review_snippets(tool_id);
create index if not exists idx_review_snippets_sentiment on public.review_snippets(sentiment);
create index if not exists idx_review_snippets_publish_date on public.review_snippets(publish_date desc);
create index if not exists idx_deals_tool_id on public.deals(tool_id);
create index if not exists idx_deals_active_last_seen on public.deals(active, last_seen desc);
create index if not exists idx_reports_created_at on public.reports(created_at desc);
create index if not exists idx_reports_type_entity on public.reports(report_type, entity_id);

drop trigger if exists trg_tools_updated_at on public.tools;
create trigger trg_tools_updated_at
before update on public.tools
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_deals_updated_at on public.deals;
create trigger trg_deals_updated_at
before update on public.deals
for each row execute procedure public.set_updated_at();

alter table public.tools enable row level security;
alter table public.categories enable row level security;
alter table public.tool_categories enable row level security;
alter table public.youtube_channels enable row level security;
alter table public.youtube_videos enable row level security;
alter table public.video_mentions enable row level security;
alter table public.review_snippets enable row level security;
alter table public.deals enable row level security;
alter table public.reports enable row level security;

drop policy if exists "Public read tools" on public.tools;
create policy "Public read tools"
on public.tools
for select
using (true);

drop policy if exists "Public read categories" on public.categories;
create policy "Public read categories"
on public.categories
for select
using (true);

drop policy if exists "Public read tool_categories" on public.tool_categories;
create policy "Public read tool_categories"
on public.tool_categories
for select
using (true);

drop policy if exists "Public read youtube_channels" on public.youtube_channels;
create policy "Public read youtube_channels"
on public.youtube_channels
for select
using (true);

drop policy if exists "Public read youtube_videos" on public.youtube_videos;
create policy "Public read youtube_videos"
on public.youtube_videos
for select
using (true);

drop policy if exists "Public read video_mentions" on public.video_mentions;
create policy "Public read video_mentions"
on public.video_mentions
for select
using (true);

drop policy if exists "Public read review_snippets" on public.review_snippets;
create policy "Public read review_snippets"
on public.review_snippets
for select
using (true);

drop policy if exists "Public read deals" on public.deals;
create policy "Public read deals"
on public.deals
for select
using (true);

drop policy if exists "Public create reports" on public.reports;
create policy "Public create reports"
on public.reports
for insert
to anon, authenticated
with check (true);

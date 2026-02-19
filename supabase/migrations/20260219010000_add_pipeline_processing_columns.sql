-- Add ingestion/extraction pipeline support columns.
-- Safe to run repeatedly.

alter table public.youtube_videos
  add column if not exists processed_at timestamptz,
  add column if not exists transcript_status text,
  add column if not exists deals_parsed_at timestamptz;

update public.youtube_videos
set transcript_status = 'pending'
where transcript_status is null;

alter table public.youtube_videos drop constraint if exists youtube_videos_transcript_status_valid;
alter table public.youtube_videos
  add constraint youtube_videos_transcript_status_valid
  check (transcript_status in ('pending', 'ok', 'missing', 'failed'));

alter table public.youtube_videos
  alter column transcript_status set default 'pending';

create index if not exists idx_youtube_videos_processed_at
  on public.youtube_videos(processed_at);

create index if not exists idx_youtube_videos_deals_parsed_at
  on public.youtube_videos(deals_parsed_at);

alter table public.review_snippets
  add column if not exists raw_snippet_text text;

alter table public.deals
  add column if not exists source text;

update public.deals
set source = 'description'
where source is null;

alter table public.deals drop constraint if exists deals_source_valid;
alter table public.deals
  add constraint deals_source_valid
  check (source in ('description', 'transcript'));

alter table public.deals
  alter column source set default 'description';

create index if not exists idx_deals_source
  on public.deals(source);

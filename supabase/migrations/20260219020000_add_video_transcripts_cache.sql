create table if not exists public.video_transcripts (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.youtube_videos(id) on delete cascade,
  youtube_video_id text not null,
  transcript_text text not null,
  segments_json jsonb not null default '[]'::jsonb,
  source text not null default 'youtube_scrape',
  fetched_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists video_transcripts_video_id_key
  on public.video_transcripts(video_id);

create index if not exists video_transcripts_fetched_at_idx
  on public.video_transcripts(fetched_at desc);

alter table public.video_transcripts
  drop constraint if exists video_transcripts_source_valid;

alter table public.video_transcripts
  add constraint video_transcripts_source_valid
  check (source in ('youtube_scrape', 'manual'));

-- Forum automation tables: report run metadata + daily news/idea audit trail
-- Run in Supabase SQL editor.

-- 1) Report runs metadata (linked to forum_posts)
create table if not exists public.report_runs (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null,
  report_kind text not null, -- 'market_research' | 'market_gaps' | 'prediction' | etc
  run_id text null, -- e.g. market_research_2025-... from services
  status text not null default 'success', -- 'success' | 'error'
  model_name text null,
  started_at timestamptz null,
  finished_at timestamptz null,
  inputs jsonb null,
  prompts jsonb null,
  outputs jsonb null,
  error text null,
  created_at timestamptz not null default now()
);

create unique index if not exists report_runs_post_id_uq on public.report_runs(post_id);
create index if not exists report_runs_kind_idx on public.report_runs(report_kind);
create index if not exists report_runs_created_at_idx on public.report_runs(created_at desc);

-- 2) Daily idea agent runs (which news were sent to LLM, and what it returned)
create table if not exists public.daily_idea_runs (
  id uuid primary key default gen_random_uuid(),
  day date not null,
  country_context text null,
  input_limit integer null,
  input_count integer null,
  model_name text null,
  prompt text null,
  raw_output text null,
  parsed_output jsonb null,
  created_at timestamptz not null default now()
);

create index if not exists daily_idea_runs_day_idx on public.daily_idea_runs(day desc);
create index if not exists daily_idea_runs_created_at_idx on public.daily_idea_runs(created_at desc);

create table if not exists public.daily_idea_run_items (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.daily_idea_runs(id) on delete cascade,
  news_url text not null,
  canonical_url text not null,
  title text null,
  source text null,
  published_at timestamptz null,
  excerpt text null,
  created_at timestamptz not null default now()
);

create unique index if not exists daily_idea_run_items_uq on public.daily_idea_run_items(run_id, canonical_url);
create index if not exists daily_idea_run_items_canonical_idx on public.daily_idea_run_items(canonical_url);
create index if not exists daily_idea_run_items_created_at_idx on public.daily_idea_run_items(created_at desc);



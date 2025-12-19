-- Prediction news usage table (SEPARATE from report dedupe)
-- This tracks which news URLs have been used for prediction questions,
-- so the same news isn't reused across multiple prediction runs.
-- Run in Supabase SQL editor.

create table if not exists public.prediction_news_usage (
  id uuid primary key default gen_random_uuid(),
  canonical_url text not null,
  news_url text not null,
  title text null,
  source text null,
  created_at timestamptz not null default now()
);

-- Index for fast dedupe lookups by canonical_url + recency
create index if not exists prediction_news_usage_canonical_idx 
  on public.prediction_news_usage(canonical_url);

create index if not exists prediction_news_usage_created_at_idx 
  on public.prediction_news_usage(created_at desc);

-- Optional: unique constraint to prevent exact duplicates in same run
-- (but allow same URL to appear in different runs for audit trail)


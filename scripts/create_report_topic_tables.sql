-- Canonical lists for automated generation.
-- Safe to run multiple times.

begin;

create table if not exists market_research_topics (
  id uuid primary key default gen_random_uuid(),
  topic text not null,
  topic_key text not null,
  active boolean not null default true,
  priority int not null default 50,
  cadence text not null default 'daily', -- daily|weekly|manual
  last_generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists market_research_topics_topic_key_uniq
  on market_research_topics(topic_key);

create index if not exists market_research_topics_active_priority_idx
  on market_research_topics(active, priority, last_generated_at);

create table if not exists market_gap_categories (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  category_key text not null,
  brand_set jsonb not null default '[]'::jsonb,
  country_context text,
  active boolean not null default true,
  priority int not null default 50,
  cadence text not null default 'daily',
  last_generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists market_gap_categories_category_key_uniq
  on market_gap_categories(category_key);

create index if not exists market_gap_categories_active_priority_idx
  on market_gap_categories(active, priority, last_generated_at);

commit;




-- Founder Projects (single active venture per founder, MVP)
-- Stores venture metadata + demo/pitch embeds for public profile discovery.

create table if not exists public.founder_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,

  name text not null default 'My Venture',
  tagline text,
  description text,
  website_url text,
  stage text,

  product_demo_url text,
  pitch_url text,

  is_public boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(user_id)
);

create index if not exists idx_founder_projects_user_id on public.founder_projects(user_id);

alter table public.founder_projects enable row level security;

-- Managed by backend (service role). End-users can access via API.
create policy "service role full access to founder_projects"
  on public.founder_projects for all
  using (auth.jwt()->>'role' = 'service_role')
  with check (auth.jwt()->>'role' = 'service_role');

-- updated_at trigger
create or replace function public.update_founder_projects_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_founder_projects_timestamp on public.founder_projects;
create trigger update_founder_projects_timestamp
  before update on public.founder_projects
  for each row
  execute function public.update_founder_projects_updated_at();



-- Cache of daily commit counts for a founder project GitHub repo.
-- Stored as aggregates only: no commit messages, no code, no diffs.

create table if not exists public.founder_github_daily_commits (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.founder_projects(id) on delete cascade,
  local_date date not null,
  commit_count int not null default 0,
  updated_at timestamptz not null default now(),
  unique(project_id, local_date)
);

create index if not exists idx_founder_github_daily_commits_project_date
  on public.founder_github_daily_commits(project_id, local_date desc);

alter table public.founder_github_daily_commits enable row level security;

create policy "service role full access to founder_github_daily_commits"
  on public.founder_github_daily_commits for all
  using (auth.jwt()->>'role' = 'service_role')
  with check (auth.jwt()->>'role' = 'service_role');



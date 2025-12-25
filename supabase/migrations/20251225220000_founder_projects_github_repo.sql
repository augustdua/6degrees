-- Add GitHub repo for founder project credibility (commits/day counts only).

alter table public.founder_projects
  add column if not exists github_repo_full_name text;

comment on column public.founder_projects.github_repo_full_name
  is 'GitHub repository in owner/repo form. Used to compute public commit counts (no code/diffs).';



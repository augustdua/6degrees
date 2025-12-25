-- Link daily standups to the founder's single venture project, and add blockers.

alter table public.daily_standups
  add column if not exists project_id uuid references public.founder_projects(id) on delete set null,
  add column if not exists blockers text;

create index if not exists idx_daily_standups_project_id on public.daily_standups(project_id);

-- Backfill: create a default project for users with standups, then link their standups to it.
insert into public.founder_projects (user_id, name)
select distinct ds.user_id, 'My Venture'
from public.daily_standups ds
left join public.founder_projects fp on fp.user_id = ds.user_id
where fp.id is null;

update public.daily_standups ds
set project_id = fp.id
from public.founder_projects fp
where fp.user_id = ds.user_id
  and ds.project_id is null;



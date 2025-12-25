-- Store GitHub App installation on the user (Railway-style connect once).

alter table public.users
  add column if not exists github_installation_id bigint,
  add column if not exists github_connected_at timestamptz;

comment on column public.users.github_installation_id is 'GitHub App installation id for this user connection.';
comment on column public.users.github_connected_at is 'When the user connected GitHub (App installation attached).';



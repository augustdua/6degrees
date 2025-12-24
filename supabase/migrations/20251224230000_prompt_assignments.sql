-- Server-side prompt leases / assignments.
-- Goal: make "unanswered prompts" idempotent across refresh/devices and track lifecycle events.

create table if not exists public.prompt_assignments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,

  -- Prompt type namespace (extendable)
  prompt_kind text not null check (prompt_kind in ('personality', 'opinion_swipe')),

  -- Reference to the underlying prompt record (uuid-as-text for future flexibility)
  prompt_ref_id text not null,

  -- Snapshot of what was served (question text / statement, options, etc.)
  prompt_payload jsonb not null,

  status text not null default 'active' check (status in ('active', 'answered', 'dismissed', 'expired')),

  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),

  shown_at timestamptz,
  answered_at timestamptz,
  dismissed_at timestamptz,
  expired_at timestamptz,

  -- Snapshot of the answer for analytics/debugging (authoritative data still lives in its own tables)
  answer_payload jsonb
);

create index if not exists idx_prompt_assignments_user_active
  on public.prompt_assignments(user_id, created_at desc)
  where status = 'active';

create index if not exists idx_prompt_assignments_user_status
  on public.prompt_assignments(user_id, status, created_at desc);

create index if not exists idx_prompt_assignments_expires_at
  on public.prompt_assignments(expires_at);

alter table public.prompt_assignments enable row level security;

-- Managed by backend service role key. End-users should not read raw assignments directly.
create policy "service role can read prompt_assignments"
  on public.prompt_assignments for select
  using (auth.jwt()->>'role' = 'service_role');

create policy "service role can insert prompt_assignments"
  on public.prompt_assignments for insert
  with check (auth.jwt()->>'role' = 'service_role');

create policy "service role can update prompt_assignments"
  on public.prompt_assignments for update
  using (auth.jwt()->>'role' = 'service_role')
  with check (auth.jwt()->>'role' = 'service_role');



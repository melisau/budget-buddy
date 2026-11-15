-- In-app and e-mail notifications (budget limits, goal deadlines, family
-- invitations). Additive and backward compatible: a new table and one new
-- users column with a default. The application tolerates both being absent,
-- so the code can be deployed before this migration is applied.
alter table public.users
  add column if not exists notify_email boolean not null default true;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  kind text not null check (kind in ('budget_warning', 'budget_exceeded', 'goal_due', 'family_invite')),
  -- One notification per event: the same budget threshold, goal deadline or
  -- invitation never produces a second row.
  dedupe_key text not null,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  emailed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, dedupe_key)
);

create index if not exists notifications_user_created_idx
  on public.notifications(user_id, created_at desc);

-- Same model as the other tables: no browser access; the server derives the
-- user from the verified session and uses the privileged client.
alter table public.notifications enable row level security;

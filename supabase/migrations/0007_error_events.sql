-- Retain a small, private audit trail for application failures.
create table if not exists public.error_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  source text not null check (source in ('client', 'boundary', 'server')),
  message text not null,
  stack text,
  path text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists error_events_created_idx on public.error_events(created_at desc);
create index if not exists error_events_user_created_idx on public.error_events(user_id, created_at desc);

alter table public.error_events enable row level security;

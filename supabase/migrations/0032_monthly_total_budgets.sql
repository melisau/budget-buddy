-- One overall spending limit per user and month, next to the per-category
-- budgets. Additive: a new table, deny-by-default like the others, with a
-- read-only policy for the owner. Writes go through the server.
create table if not exists public.monthly_total_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  -- First day of the month the limit is for.
  start_date date not null check (extract(day from start_date) = 1),
  amount_limit numeric(14, 2) not null check (amount_limit > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, start_date)
);

alter table public.monthly_total_budgets enable row level security;
revoke all on public.monthly_total_budgets from anon, authenticated;
grant select on public.monthly_total_budgets to authenticated;

drop policy if exists monthly_total_budgets_select_own on public.monthly_total_budgets;
create policy monthly_total_budgets_select_own on public.monthly_total_budgets
  for select to authenticated
  using (user_id = (select public.current_app_user_id()));

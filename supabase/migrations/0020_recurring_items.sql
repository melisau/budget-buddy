-- Recurring items (rent, salary, bills) and subscriptions (Netflix, Spotify...).
-- Additive and backward compatible: one new table and one nullable column.
-- The application tolerates both being absent, so the code can be deployed
-- before this migration is applied.
create table if not exists public.recurring_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  kind text not null default 'regular' check (kind in ('regular', 'subscription')),
  type text not null check (type in ('income', 'expense')),
  title text not null check (char_length(title) between 2 and 120),
  amount numeric(14, 2) not null check (amount > 0),
  category_id uuid references public.categories(id) on delete set null,
  account_id uuid references public.accounts(id) on delete set null,
  frequency text not null check (frequency in ('weekly', 'monthly', 'yearly')),
  -- The first date of the schedule; every later date is counted from it.
  start_date date not null,
  -- The next date a transaction will be created for.
  next_date date not null,
  end_date date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A subscription is always an expense.
  check (kind <> 'subscription' or type = 'expense')
);

create index if not exists recurring_items_user_idx
  on public.recurring_items(user_id, active, next_date);

-- Same model as the other tables: no browser access; the server derives the
-- user from the verified session and uses the privileged client.
alter table public.recurring_items enable row level security;

-- Which recurring item created a transaction. Deleting the item keeps the
-- history. The unique index makes creating the same occurrence twice
-- impossible, even when two requests run at once (rows without an item are
-- never in conflict, because NULLs are distinct).
alter table public.transactions
  add column if not exists recurring_item_id uuid references public.recurring_items(id) on delete set null;

create unique index if not exists transactions_recurring_occurrence_idx
  on public.transactions(recurring_item_id, transaction_date);

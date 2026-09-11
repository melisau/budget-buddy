-- BudgetBuddy application schema for Supabase PostgreSQL.
-- Clerk remains the authentication authority. All application access will be
-- mediated by trusted Next.js server code using a Clerk user id lookup.

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text unique not null,
  email text,
  name text,
  avatar_url text,
  plan text not null default 'free' check (plan in ('free', 'core', 'pro')),
  currency text not null default 'TRY' check (currency in ('TRY', 'EUR', 'USD', 'GBP')),
  language text not null default 'en' check (language in ('en', 'tr')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.family_groups (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  currency text not null default 'TRY' check (currency in ('TRY', 'EUR', 'USD', 'GBP')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_group_id uuid not null references public.family_groups(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  invited_email text,
  role text not null default 'member' check (role in ('owner', 'member', 'viewer')),
  invitation_status text not null default 'accepted' check (invitation_status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (family_group_id, user_id),
  check (user_id is not null or invited_email is not null)
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  family_group_id uuid references public.family_groups(id) on delete cascade,
  name text not null,
  type text not null check (type in ('cash', 'checking', 'savings', 'credit_card', 'digital_wallet')),
  currency text not null default 'TRY' check (currency in ('TRY', 'EUR', 'USD', 'GBP')),
  initial_balance numeric(14, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  icon text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (user_id, name, type)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  owner_user_id uuid references public.users(id) on delete set null,
  created_by_user_id uuid references public.users(id) on delete set null,
  family_group_id uuid references public.family_groups(id) on delete set null,
  account_id uuid references public.accounts(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  type text not null check (type in ('income', 'expense')),
  amount numeric(14, 2) not null check (amount > 0),
  title text not null,
  note text,
  transaction_date date not null,
  receipt_path text,
  receipt_content_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  family_group_id uuid references public.family_groups(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  amount_limit numeric(14, 2) not null check (amount_limit > 0),
  period text not null default 'monthly' check (period = 'monthly'),
  start_date date not null,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (user_id, family_group_id, category_id, start_date)
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  family_group_id uuid references public.family_groups(id) on delete cascade,
  name text not null,
  target_amount numeric(14, 2) not null check (target_amount > 0),
  current_amount numeric(14, 2) not null default 0 check (current_amount >= 0),
  deadline date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  question text not null,
  response text not null,
  context_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at before update on public.users
for each row execute function public.set_updated_at();

drop trigger if exists family_groups_set_updated_at on public.family_groups;
create trigger family_groups_set_updated_at before update on public.family_groups
for each row execute function public.set_updated_at();

drop trigger if exists accounts_set_updated_at on public.accounts;
create trigger accounts_set_updated_at before update on public.accounts
for each row execute function public.set_updated_at();

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at before update on public.categories
for each row execute function public.set_updated_at();

drop trigger if exists transactions_set_updated_at on public.transactions;
create trigger transactions_set_updated_at before update on public.transactions
for each row execute function public.set_updated_at();

drop trigger if exists budgets_set_updated_at on public.budgets;
create trigger budgets_set_updated_at before update on public.budgets
for each row execute function public.set_updated_at();

drop trigger if exists goals_set_updated_at on public.goals;
create trigger goals_set_updated_at before update on public.goals
for each row execute function public.set_updated_at();

drop trigger if exists ai_sessions_set_updated_at on public.ai_sessions;
create trigger ai_sessions_set_updated_at before update on public.ai_sessions
for each row execute function public.set_updated_at();

create index if not exists transactions_user_date_idx on public.transactions(user_id, transaction_date desc);
create index if not exists transactions_family_date_idx on public.transactions(family_group_id, transaction_date desc);
create index if not exists family_members_group_idx on public.family_members(family_group_id);
create index if not exists budgets_user_period_idx on public.budgets(user_id, start_date desc);

-- Tables are private by default. There are intentionally no browser-access
-- policies: data will be queried only by trusted server actions/routes after
-- Clerk identity and ownership checks are complete.
alter table public.users enable row level security;
alter table public.family_groups enable row level security;
alter table public.family_members enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.goals enable row level security;
alter table public.ai_sessions enable row level security;

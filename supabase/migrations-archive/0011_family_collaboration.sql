-- Add opt-in family collaboration without exposing private transactions or goals.
begin;

create table public.goal_shares (
  goal_id uuid not null references public.goals(id) on delete cascade,
  family_group_id uuid not null references public.family_groups(id) on delete cascade,
  shared_by_user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (goal_id, family_group_id)
);
create index goal_shares_family_idx on public.goal_shares(family_group_id);

create table public.allowance_plans (
  user_id uuid primary key references public.users(id) on delete cascade,
  monthly_amount numeric(14, 2) not null check (monthly_amount > 0),
  savings_percent integer not null default 20 check (savings_percent between 0 and 100),
  updated_at timestamptz not null default now()
);
create trigger allowance_plans_set_updated_at before update on public.allowance_plans
for each row execute function public.set_updated_at();

create table public.family_shopping_notes (
  family_group_id uuid primary key references public.family_groups(id) on delete cascade,
  content text not null default '' check (length(content) <= 2000),
  updated_by_user_id uuid references public.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
create trigger family_shopping_notes_set_updated_at before update on public.family_shopping_notes
for each row execute function public.set_updated_at();

create table public.family_shopping_items (
  id uuid primary key default gen_random_uuid(),
  family_group_id uuid not null references public.family_groups(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 120),
  quantity text not null default '' check (length(quantity) <= 40),
  requested_by_user_id uuid not null references public.users(id) on delete cascade,
  checked_by_user_id uuid references public.users(id) on delete set null,
  checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index family_shopping_items_group_idx on public.family_shopping_items(family_group_id, created_at desc);
create trigger family_shopping_items_set_updated_at before update on public.family_shopping_items
for each row execute function public.set_updated_at();

-- A list owner controls whether reservation state is visible to themselves.
-- The server API, not a client-side filter, enforces surprise mode.
create table public.wishlists (
  id uuid primary key default gen_random_uuid(),
  family_group_id uuid not null references public.family_groups(id) on delete cascade,
  owner_user_id uuid not null references public.users(id) on delete cascade,
  title text not null check (length(btrim(title)) between 2 and 100),
  occasion text not null check (occasion in ('birthday', 'housewarming', 'new_year', 'other')),
  event_date date,
  surprise boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index wishlists_family_idx on public.wishlists(family_group_id, created_at desc);
create trigger wishlists_set_updated_at before update on public.wishlists
for each row execute function public.set_updated_at();

create table public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  wishlist_id uuid not null references public.wishlists(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 120),
  product_url text check (product_url is null or length(product_url) <= 500),
  note text not null default '' check (length(note) <= 300),
  reserved_by_user_id uuid references public.users(id) on delete set null,
  reserved_at timestamptz,
  created_at timestamptz not null default now()
);
create index wishlist_items_list_idx on public.wishlist_items(wishlist_id, created_at);

-- Browser table access stays denied; server routes verify the session and
-- membership before using the server-only privileged client.
alter table public.goal_shares enable row level security;
alter table public.allowance_plans enable row level security;
alter table public.family_shopping_notes enable row level security;
alter table public.family_shopping_items enable row level security;
alter table public.wishlists enable row level security;
alter table public.wishlist_items enable row level security;

-- New users start with an empty workspace. Existing sample or real finance
-- records are untouched; no account or transaction is required to make a goal.
create or replace function public.sync_authenticated_user()
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  identity auth.users%rowtype;
  app_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text, 10));
  select * into identity from auth.users where id = auth.uid();
  if not found or identity.email_confirmed_at is null or identity.email is null
    or (identity.banned_until is not null and identity.banned_until > now()) then
    raise exception 'Verified active account required' using errcode = '42501';
  end if;
  select id into app_id from public.users where auth_user_id = identity.id;
  if app_id is null then
    if exists (select 1 from public.users where clerk_user_id is not null
      and pg_catalog.lower(email) = pg_catalog.lower(identity.email)) then
      raise exception 'Existing account requires administrator identity migration';
    end if;
    insert into public.users(auth_user_id, email, name, avatar_url)
    values (identity.id, identity.email,
      coalesce(nullif(pg_catalog.left(identity.raw_user_meta_data->>'full_name', 100), ''), identity.email), null)
    returning id into app_id;
  else
    update public.users set email = identity.email,
      name = coalesce(nullif(pg_catalog.left(identity.raw_user_meta_data->>'full_name', 100), ''), name)
    where id = app_id;
  end if;
  return app_id;
end;
$$;
revoke all on function public.sync_authenticated_user() from public, anon;
grant execute on function public.sync_authenticated_user() to authenticated;

commit;

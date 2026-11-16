-- Category rules: "if the description contains <keyword>, use <category>".
-- Additive and backward compatible: one new table. The application tolerates
-- it being absent, so the code can be deployed before this migration.
create table if not exists public.category_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  keyword text not null check (char_length(keyword) between 2 and 80),
  type text not null check (type in ('income', 'expense')),
  category_id uuid not null references public.categories(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- One rule per keyword and type (case-insensitive) for each user.
create unique index if not exists category_rules_keyword_idx
  on public.category_rules(user_id, type, lower(keyword));

create index if not exists category_rules_user_idx
  on public.category_rules(user_id);

-- Same model as the other tables: no browser access; the server derives the
-- user from the verified session and uses the privileged client.
alter table public.category_rules enable row level security;

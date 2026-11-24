-- Lets a user show an automatic instruction (rent, bills, subscriptions) to one
-- of their family groups as an upcoming payment. Additive and optional:
-- null keeps the item private, which is the default for every existing row.
alter table public.recurring_items
  add column if not exists shared_family_group_id uuid
  references public.family_groups(id) on delete set null;

create index if not exists recurring_items_shared_group_idx
  on public.recurring_items(shared_family_group_id, active, next_date)
  where shared_family_group_id is not null;

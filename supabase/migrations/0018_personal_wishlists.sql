-- Wishlists no longer require a family group. A list without a group is
-- personal: only its owner can read or change it (enforced by server routes).
-- Additive and backward compatible: existing family lists keep their group.
alter table public.wishlists alter column family_group_id drop not null;

create index if not exists wishlists_personal_owner_idx
  on public.wishlists(owner_user_id, created_at desc)
  where family_group_id is null;

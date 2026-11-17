-- Optional read-only share links for wishlists. A list with a share token can
-- be viewed by anyone holding the link; reservations and owner identity are
-- never exposed there (enforced by the server page). Clearing the token
-- revokes the link. Additive and backward compatible.
alter table public.wishlists add column if not exists share_token text;
alter table public.wishlists add column if not exists shared_at timestamptz;

alter table public.wishlists drop constraint if exists wishlists_share_token_format;
alter table public.wishlists add constraint wishlists_share_token_format
  check (share_token is null or share_token ~ '^[A-Za-z0-9_-]{32}$');

create unique index if not exists wishlists_share_token_idx
  on public.wishlists(share_token)
  where share_token is not null;

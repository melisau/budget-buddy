-- Private avatar selections are independent of financial and Auth identities.
-- Existing users keep their initials. Existing users RLS still denies direct
-- browser writes; only verified server routes update the acting user's row.
alter table public.users
  add column if not exists avatar_icon text not null default 'initials',
  add column if not exists avatar_path text;

alter table public.users add constraint users_avatar_icon_check
  check (avatar_icon in ('initials', 'cat', 'dog', 'flower', 'sun', 'mountain'));
alter table public.users add constraint users_avatar_path_check
  check (avatar_path is null or avatar_path ~ ('^' || id::text || '/[0-9a-f-]{36}\.(jpg|png|webp)$'));

-- Allows German as a user's language. Widening a check is backward compatible:
-- every existing value ('en', 'tr') stays valid.
alter table public.users drop constraint if exists users_language_check;
alter table public.users add constraint users_language_check check (language in ('en', 'tr', 'de'));

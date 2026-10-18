-- Close leftovers of the reverted Supabase Auth cutover (archived 0010/0011).
--
-- Safe on every database: each step only acts when the object exists, and no
-- data is changed or dropped. Clerk is the identity provider; the browser must
-- not be able to call database functions directly.

do $$
begin
  -- 0010/0011 granted this to the browser's `authenticated` role.
  if to_regprocedure('public.sync_authenticated_user()') is not null then
    execute 'revoke all on function public.sync_authenticated_user() from public, anon, authenticated';
    execute 'comment on function public.sync_authenticated_user() is ''Unused: Supabase Auth cutover was reverted. Not callable from browsers.''';
  end if;

  if to_regprocedure('public.link_legacy_auth_user(uuid, uuid)') is not null then
    execute 'revoke all on function public.link_legacy_auth_user(uuid, uuid) from public, anon, authenticated';
  end if;

  -- The starter-data seeder must only ever run from the trusted server.
  if to_regprocedure('public.seed_user_starter_data(uuid)') is not null then
    execute 'revoke all on function public.seed_user_starter_data(uuid) from public, anon, authenticated';
  end if;

  -- 0010 labelled clerk_user_id as legacy; under Clerk it is the live identity.
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'users' and column_name = 'clerk_user_id') then
    execute 'comment on column public.users.clerk_user_id is ''Clerk user ID; identity used by the application''';
  end if;
end;
$$;

-- App-user sync for a database that does not contain auth.users. The server
-- passes an identity it has already verified with Supabase Auth, so only the
-- server role may call this function.
create or replace function public.sync_verified_user(p_auth_user_id uuid, p_email text, p_full_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  app_id uuid;
  display_name text := nullif(pg_catalog.left(p_full_name, 100), '');
begin
  if p_auth_user_id is null or nullif(p_email, '') is null then
    raise exception 'Verified identity required' using errcode = '42501';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_auth_user_id::text, 10));
  select id into app_id from public.users where auth_user_id = p_auth_user_id;
  if app_id is null then
    if exists (select 1 from public.users where clerk_user_id is not null
      and pg_catalog.lower(email) = pg_catalog.lower(p_email)) then
      raise exception 'Existing account requires administrator identity migration';
    end if;
    insert into public.users(auth_user_id, email, name, avatar_url)
    values (p_auth_user_id, p_email, coalesce(display_name, p_email), null)
    returning id into app_id;
  else
    update public.users set email = p_email, name = coalesce(display_name, name)
    where id = app_id;
  end if;
  return app_id;
end;
$$;

revoke all on function public.sync_verified_user(uuid, text, text) from public, anon, authenticated;
grant execute on function public.sync_verified_user(uuid, text, text) to service_role;

notify pgrst, 'reload schema';

-- Expand-only identity migration. Do not rewrite users.id or any financial FK.
-- Existing Clerk identifiers remain as audit/migration data, not credentials.
begin;

alter table public.users alter column clerk_user_id drop not null;
alter table public.users add column auth_user_id uuid unique
  references auth.users(id) on delete cascade;

-- Explicit identity mapping only. No automatic email-based account takeover.
-- This RPC is restricted to the service role; use after verifying both identities.
create function public.link_legacy_auth_user(p_app_user_id uuid, p_auth_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  target public.users%rowtype;
  identity auth.users%rowtype;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_auth_user_id::text, 10));
  select * into identity from auth.users where id = p_auth_user_id;
  if not found or identity.email_confirmed_at is null then
    raise exception 'A verified Supabase identity is required';
  end if;
  select * into target from public.users where id = p_app_user_id for update;
  if not found or target.clerk_user_id is null then
    raise exception 'Legacy application user not found';
  end if;
  if target.auth_user_id = p_auth_user_id then return; end if;
  if target.auth_user_id is not null then raise exception 'User is already linked'; end if;
  if exists (select 1 from public.users where auth_user_id = p_auth_user_id) then
    raise exception 'Auth identity already belongs to another application user';
  end if;
  -- Matching email is a guard, not authorization. Only the trusted admin can link.
  if target.email is null or identity.email is null
    or pg_catalog.lower(target.email) <> pg_catalog.lower(identity.email) then
    raise exception 'Verified email does not match the legacy account';
  end if;
  update public.users set auth_user_id = p_auth_user_id where id = p_app_user_id;
end;
$$;
revoke all on function public.link_legacy_auth_user(uuid, uuid) from public, anon, authenticated;
grant execute on function public.link_legacy_auth_user(uuid, uuid) to service_role;

create function public.sync_authenticated_user()
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
    -- Block duplicates for unmigrated accounts, without granting their data.
    if exists (select 1 from public.users where clerk_user_id is not null
      and pg_catalog.lower(email) = pg_catalog.lower(identity.email)) then
      raise exception 'Existing account requires administrator identity migration';
    end if;
    insert into public.users(auth_user_id, email, name, avatar_url)
    values (identity.id, identity.email,
      coalesce(nullif(pg_catalog.left(identity.raw_user_meta_data->>'full_name', 100), ''), identity.email),
      null)
    returning id into app_id;
  else
    update public.users set email = identity.email,
      name = coalesce(nullif(pg_catalog.left(identity.raw_user_meta_data->>'full_name', 100), ''), name)
    where id = app_id;
  end if;
  perform public.seed_user_starter_data(app_id);
  return app_id;
end;
$$;
revoke all on function public.sync_authenticated_user() from public, anon;
grant execute on function public.sync_authenticated_user() to authenticated;

-- The seed function takes an arbitrary app ID, so clients must use the wrapper.
revoke all on function public.seed_user_starter_data(uuid) from public, anon, authenticated;
grant execute on function public.seed_user_starter_data(uuid) to service_role;

-- RLS remains deny-by-default. APIs verify identity, ownership and family role
-- before using the server-only privileged data client.
comment on column public.users.auth_user_id is 'Verified Supabase Auth identity; users.id remains the stable finance owner';
comment on column public.users.clerk_user_id is 'Legacy migration/audit identifier only; no runtime authentication';
commit;

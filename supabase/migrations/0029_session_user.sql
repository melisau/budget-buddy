-- Everything an API request needs about the signed-in account in one database
-- round trip: whether it may sign in and its app user row. The access token's
-- signature is verified by the server before this is called; this reads live
-- account state, so a deleted, banned or unconfirmed account is refused at once.
-- Server role only.

create or replace function public.app_session_user(p_auth_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_state jsonb;
begin
  select jsonb_build_object(
    'confirmed', au.email_confirmed_at is not null,
    'banned', coalesce(au.banned_until > now(), false),
    'hasVerifiedFactor', exists (
      select 1 from auth.mfa_factors f where f.user_id = au.id and f.status::text = 'verified'
    ),
    'appUser', (
      select jsonb_build_object('id', u.id, 'authUserId', u.auth_user_id, 'email', u.email, 'name', u.name)
      from public.users u where u.auth_user_id = au.id
    )
  )
  into v_state
  from auth.users au
  where au.id = p_auth_user_id and au.deleted_at is null;
  return v_state;
end;
$$;

revoke all on function public.app_session_user(uuid) from public, anon, authenticated;
grant execute on function public.app_session_user(uuid) to service_role;

notify pgrst, 'reload schema';

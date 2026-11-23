#!/bin/sh
# Runs once, on an empty database volume. Identity lives in hosted Supabase Auth,
# so auth.users here is an empty stub that lets the ordered migrations apply.
set -eu

psql_run() { psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" "$@"; }

psql_run -v authenticator_password="$AUTHENTICATOR_PASSWORD" <<'SQL'
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create role authenticator login noinherit password :'authenticator_password';
grant service_role to authenticator;

create schema auth;
create table auth.users (
  id uuid primary key,
  email text,
  email_confirmed_at timestamptz,
  banned_until timestamptz,
  raw_user_meta_data jsonb default '{}'::jsonb
);
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth, public to anon, authenticated, service_role;
SQL

for file in /migrations/*.sql; do
  echo "Applying $(basename "$file")"
  psql_run -q -f "$file"
done

psql_run <<'SQL'
-- App users are linked to hosted Auth by ID; no local identity row exists.
do $$
declare constraint_name text;
begin
  select c.conname into constraint_name
  from pg_constraint c
  where c.conrelid = 'public.users'::regclass
    and c.confrelid = 'auth.users'::regclass;
  if constraint_name is not null then
    execute format('alter table public.users drop constraint %I', constraint_name);
  end if;
end $$;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
SQL

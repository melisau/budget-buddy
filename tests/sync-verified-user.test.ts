import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { after, before, test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
const identity = "a0000000-0000-4000-8000-000000000001";
const sync = (id: string, email: string, name = "") =>
  db.query<{ id: string }>("select public.sync_verified_user($1, $2, $3) as id", [id, email, name]);

before(async () => {
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz, banned_until timestamptz, raw_user_meta_data jsonb default '{}'::jsonb);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth, public to anon, authenticated, service_role;
  `);
  const directory = new URL("../supabase/migrations/", import.meta.url);
  for (const file of (await readdir(directory)).filter((name) => name.endsWith(".sql")).sort()) {
    await db.exec(await readFile(new URL(file, directory), "utf8"));
  }
  await db.exec("alter table public.users drop constraint users_auth_user_id_fkey");
});

after(async () => { await db.close(); });

test("creates one app user and updates it on later sign-ins", async () => {
  const first = (await sync(identity, "first@example.test", "First")).rows[0].id;
  const second = (await sync(identity, "new@example.test")).rows[0].id;
  assert.equal(second, first);
  const { rows } = await db.query<{ email: string; name: string }>("select email, name from public.users where id = $1", [first]);
  assert.deepEqual(rows[0], { email: "new@example.test", name: "First" });
});

test("does not link a legacy account by email", async () => {
  await db.query("insert into public.users(clerk_user_id, email, name) values ('legacy', 'legacy@example.test', 'Legacy')");
  await assert.rejects(sync("a0000000-0000-4000-8000-000000000002", "LEGACY@example.test"), /administrator identity migration/);
});

test("only the server role can execute it", async () => {
  for (const [role, allowed] of [["anon", false], ["authenticated", false], ["service_role", true]] as const) {
    const { rows } = await db.query<{ allowed: boolean }>("select has_function_privilege($1, 'public.sync_verified_user(uuid, text, text)', 'execute') as allowed", [role]);
    assert.equal(rows[0].allowed, allowed);
  }
});

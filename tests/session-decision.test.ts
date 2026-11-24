import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { after, before, test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { decideSession } from "../lib/auth/session-decision.ts";

const appUser = { id: "app", authUserId: "auth", email: "a@example.test", name: "A" };
const account = { confirmed: true, banned: false, hasVerifiedFactor: false, appUser };

test("allows a confirmed account", () => {
  assert.deepEqual(decideSession(account, "aal1"), { kind: "ok", appUser });
});

test("refuses missing, unconfirmed and banned accounts", () => {
  assert.equal(decideSession(null, "aal1").kind, "signed-out");
  assert.equal(decideSession({ ...account, confirmed: false }, "aal1").kind, "signed-out");
  assert.equal(decideSession({ ...account, banned: true }, "aal2").kind, "signed-out");
});

test("requires the second step when two-step verification is on", () => {
  const withFactor = { ...account, hasVerifiedFactor: true };
  assert.equal(decideSession(withFactor, "aal1").kind, "signed-out");
  assert.equal(decideSession(withFactor, undefined).kind, "signed-out");
  assert.equal(decideSession(withFactor, "aal2").kind, "ok");
});

test("asks to create the app user on a first request", () => {
  assert.equal(decideSession({ ...account, appUser: null }, "aal1").kind, "needs-app-user");
});

const db = new PGlite();
const ids = { ok: "70000000-0000-4000-8000-000000000001", mfa: "70000000-0000-4000-8000-000000000002", banned: "70000000-0000-4000-8000-000000000003", deleted: "70000000-0000-4000-8000-000000000004" };

before(async () => {
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz, banned_until timestamptz, deleted_at timestamptz, raw_user_meta_data jsonb default '{}'::jsonb);
    create table auth.mfa_factors (id uuid primary key default gen_random_uuid(), user_id uuid, status text);
    create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
  `);
  const directory = new URL("../supabase/migrations/", import.meta.url);
  for (const file of (await readdir(directory)).filter((name) => name.endsWith(".sql")).sort()) {
    await db.exec(await readFile(new URL(file, directory), "utf8"));
  }
  await db.query(`insert into auth.users(id, email, email_confirmed_at, banned_until, deleted_at) values
    ($1, 'ok@example.test', now(), null, null),
    ($2, 'mfa@example.test', now(), null, null),
    ($3, 'banned@example.test', now(), now() + interval '1 day', null),
    ($4, 'deleted@example.test', now(), null, now())`, [ids.ok, ids.mfa, ids.banned, ids.deleted]);
  await db.query("insert into auth.mfa_factors(user_id, status) values ($1, 'verified')", [ids.mfa]);
  await db.query("insert into public.users(auth_user_id, email, name) values ($1, 'ok@example.test', 'Ok')", [ids.ok]);
});
after(async () => { await db.close(); });

async function state(id: string) {
  return (await db.query<{ v: Parameters<typeof decideSession>[0] }>("select public.app_session_user($1) as v", [id])).rows[0].v;
}

test("reads live account state in one call", async () => {
  const ok = await state(ids.ok);
  assert.equal(decideSession(ok, "aal1").kind, "ok");
  assert.equal(decideSession(await state(ids.mfa), "aal1").kind, "signed-out");
  assert.equal(decideSession(await state(ids.mfa), "aal2").kind, "needs-app-user");
  assert.equal(decideSession(await state(ids.banned), "aal1").kind, "signed-out");
  assert.equal(await state(ids.deleted), null);
  const grant = await db.query<{ v: boolean }>("select has_function_privilege('authenticated', 'public.app_session_user(uuid)', 'execute') as v");
  assert.equal(grant.rows[0].v, false);
});

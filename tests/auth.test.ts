import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { authDestination } from "../lib/auth/redirect.ts";

// Actual PostgreSQL/PLpgSQL engine in memory. No env files, remote URLs or data.
const db = new PGlite();
const legacyId = "10000000-0000-4000-8000-000000000001";
const authId = "20000000-0000-4000-8000-000000000001";
const otherId = "20000000-0000-4000-8000-000000000002";

before(async () => {
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema auth;
    create table auth.users (
      id uuid primary key, email text, email_confirmed_at timestamptz,
      banned_until timestamptz, raw_user_meta_data jsonb default '{}'::jsonb
    );
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth, public to anon, authenticated, service_role;
  `);
  const directory = new URL("../supabase/migrations/", import.meta.url);
  for (const file of (await readdir(directory)).filter((name) => name.endsWith(".sql")).sort()) {
    if (file.startsWith("0010")) {
      await db.query("insert into public.users(id, clerk_user_id, email, name) values ($1, 'user_legacy', 'legacy@example.test', 'Original')", [legacyId]);
      await db.query("insert into public.accounts(user_id, name, type, initial_balance) values ($1, 'Existing savings', 'savings', 12345.67)", [legacyId]);
      await db.query("insert into public.transactions(user_id, type, amount, title, transaction_date) values ($1, 'expense', 123.45, 'Keep me', current_date)", [legacyId]);
    }
    await db.exec(await readFile(new URL(file, directory), "utf8"));
  }
  await db.query("insert into auth.users(id, email, email_confirmed_at) values ($1, 'legacy@example.test', now()), ($2, 'new@example.test', now())", [authId, otherId]);
  // Match Supabase's table grants: RLS, not absent grants, must prevent access.
  await db.exec("grant select, insert, update, delete on all tables in schema public to anon, authenticated");
});
after(async () => { await db.close(); });

async function asUser<T>(id: string, run: () => Promise<T>): Promise<T> {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
  await db.exec("set role authenticated");
  try { return await run(); } finally { await db.exec("reset role"); }
}

test("auth redirects reject external URLs, protocol-relative paths and injected routes", () => {
  for (const value of [null, "https://evil.test", "//evil.test", "/\\evil.test", "/api/account", "/family?evil=1"]) assert.equal(authDestination(value), "/dashboard");
  assert.equal(authDestination("/family"), "/family");
  assert.equal(authDestination("/update-password"), "/update-password");
});

test("migration preserves legacy financial rows and stable IDs", async () => {
  const { rows } = await db.query<{ id: string; auth_user_id: string | null; clerk_user_id: string }>("select id, auth_user_id, clerk_user_id from public.users where id=$1", [legacyId]);
  assert.deepEqual(rows[0], { id: legacyId, auth_user_id: null, clerk_user_id: "user_legacy" });
  const account = await db.query<{ initial_balance: string }>("select initial_balance from public.accounts where user_id=$1", [legacyId]);
  assert.equal(Number(account.rows[0].initial_balance), 12345.67);
});

test("email match cannot claim legacy data and authenticated users cannot run admin mapping", async () => {
  await asUser(authId, async () => {
    await assert.rejects(db.query("select public.sync_authenticated_user()"), /administrator identity migration/);
    await assert.rejects(db.query("select public.link_legacy_auth_user($1, $2)", [legacyId, authId]), /permission denied/);
    assert.equal((await db.query("select * from public.transactions")).rows.length, 0);
  });
});

test("admin mapping preserves finance and refuses a conflicting identity", async () => {
  await db.exec("set role service_role");
  try {
    await assert.rejects(db.query("select public.link_legacy_auth_user($1, $2)", [legacyId, otherId]), /does not match/);
    await db.query("select public.link_legacy_auth_user($1, $2)", [legacyId, authId]);
    await db.query("select public.link_legacy_auth_user($1, $2)", [legacyId, authId]);
    await assert.rejects(db.query("select public.link_legacy_auth_user($1, $2)", [legacyId, otherId]), /already linked/);
  } finally { await db.exec("reset role"); }
  await asUser(authId, async () => {
    const result = await db.query<{ sync_authenticated_user: string }>("select public.sync_authenticated_user()");
    assert.equal(result.rows[0].sync_authenticated_user, legacyId);
  });
  const rows = (await db.query<{ title: string }>("select * from public.transactions where user_id=$1", [legacyId])).rows;
  assert.equal(rows.length, 1);
  assert.equal(rows[0].title, "Keep me");
});

test("new identity creates one app user and seeds once; metadata cannot assign a plan", async () => {
  await db.query(`update auth.users set raw_user_meta_data='{"full_name":"New Person","plan":"pro","auth_user_id":"${authId}"}' where id=$1`, [otherId]);
  await asUser(otherId, async () => {
    const a = await db.query("select public.sync_authenticated_user()");
    const b = await db.query("select public.sync_authenticated_user()");
    assert.deepEqual(a.rows, b.rows);
    await assert.rejects(db.query("select public.seed_user_starter_data($1)", [legacyId]), /permission denied/);
    assert.equal((await db.query("select * from public.users")).rows.length, 0);
  });
  const users = await db.query<{ id: string; name: string; plan: string }>("select id, name, plan from public.users where auth_user_id=$1", [otherId]);
  assert.equal(users.rows.length, 1);
  assert.equal(users.rows[0].name, "New Person");
  assert.equal(users.rows[0].plan, "free");
  assert.equal((await db.query("select * from public.transactions where user_id=$1", [users.rows[0].id])).rows.length, 4);
});

test("unverified, banned, anonymous and deleted identities cannot provision an app user", async () => {
  const id = "20000000-0000-4000-8000-000000000003";
  await db.query("insert into auth.users(id, email) values ($1, 'unverified@example.test')", [id]);
  await asUser(id, async () => { await assert.rejects(db.query("select public.sync_authenticated_user()"), /Verified active/); });
  await db.query("update auth.users set email_confirmed_at=now(), banned_until=now()+interval '1 day' where id=$1", [id]);
  await asUser(id, async () => { await assert.rejects(db.query("select public.sync_authenticated_user()"), /Verified active/); });
  await db.query("delete from auth.users where id=$1", [id]);
  await asUser(id, async () => { await assert.rejects(db.query("select public.sync_authenticated_user()"), /Verified active/); });
  await asUser("", async () => { await assert.rejects(db.query("select public.sync_authenticated_user()"), /Sign in required/); });
  await db.exec("set role anon");
  try { await assert.rejects(db.query("select public.sync_authenticated_user()"), /permission denied/); } finally { await db.exec("reset role"); }
});

test("Auth deletion cascades only that user's data and rollback preserves both identity and finance", async () => {
  await db.exec("begin");
  await db.query("delete from auth.users where id=$1", [authId]);
  assert.equal((await db.query("select * from public.users where id=$1", [legacyId])).rows.length, 0);
  assert.equal((await db.query("select * from public.transactions where user_id=$1", [legacyId])).rows.length, 0);
  await db.exec("rollback");
  assert.equal((await db.query("select * from public.transactions where user_id=$1", [legacyId])).rows.length, 1);
  await db.query("delete from auth.users where id=$1", [authId]);
  assert.equal((await db.query("select * from public.users where auth_user_id=$1", [otherId])).rows.length, 1);
  assert.equal((await db.query("select * from public.transactions")).rows.length, 4);
});

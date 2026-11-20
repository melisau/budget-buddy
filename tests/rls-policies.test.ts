import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { after, before, test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

// Runs every migration in an in-process Postgres and reads as the
// `authenticated` role, the way a user-scoped Supabase client would.
const db = new PGlite();

const auth = { alice: "a0000000-0000-4000-8000-000000000001", bob: "a0000000-0000-4000-8000-000000000002", carol: "a0000000-0000-4000-8000-000000000003", dave: "a0000000-0000-4000-8000-000000000004" };
const app = { alice: "b0000000-0000-4000-8000-000000000001", bob: "b0000000-0000-4000-8000-000000000002", carol: "b0000000-0000-4000-8000-000000000003", dave: "b0000000-0000-4000-8000-000000000004" };
const family = "c0000000-0000-4000-8000-000000000001";
const otherFamily = "c0000000-0000-4000-8000-000000000002";

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
    await db.exec(await readFile(new URL(file, directory), "utf8"));
  }
  // Match Supabase's table grants: RLS, not absent grants, must prevent access.
  await db.exec("grant select, insert, update, delete on all tables in schema public to anon, authenticated");

  for (const name of ["alice", "bob", "carol", "dave"] as const) {
    await db.query("insert into auth.users(id, email, email_confirmed_at) values ($1, $2, now())", [auth[name], `${name}@example.test`]);
    await db.query("insert into public.users(id, auth_user_id, email, name) values ($1, $2, $3, $4)", [app[name], auth[name], `${name}@example.test`, name]);
  }
  // Alice and Bob share a family; Carol is only invited; Dave left it.
  await db.query("insert into public.family_groups(id, owner_user_id, name) values ($1, $2, 'Home'), ($3, $4, 'Other')", [family, app.alice, otherFamily, app.carol]);
  await db.query(`insert into public.family_members(family_group_id, user_id, role, invitation_status) values
    ($1, $2, 'owner', 'accepted'), ($1, $3, 'member', 'accepted'), ($1, $4, 'member', 'pending'),
    ($1, $5, 'member', 'declined'), ($6, $4, 'owner', 'accepted')`, [family, app.alice, app.bob, app.carol, app.dave, otherFamily]);

  await db.query(`insert into public.transactions(user_id, type, amount, title, transaction_date, family_group_id) values
    ($1, 'expense', 10, 'alice private', current_date, null),
    ($2, 'expense', 20, 'bob private', current_date, null),
    ($1, 'expense', 30, 'family groceries', current_date, $3),
    ($4, 'expense', 40, 'carol other family', current_date, $5)`, [app.alice, app.bob, family, app.carol, otherFamily]);
  await db.query("insert into public.goals(user_id, name, target_amount) values ($1, 'alice goal', 100), ($2, 'bob goal', 100)", [app.alice, app.bob]);
  await db.query("insert into public.wishlists(family_group_id, owner_user_id, title, occasion) values ($1, $2, 'Alice birthday', 'birthday'), ($1, $3, 'Dave old list', 'other'), (null, $2, 'Alice personal', 'other')", [family, app.alice, app.dave]);
  await db.query("insert into public.wishlist_items(wishlist_id, name) select id, 'Book' from public.wishlists where title = 'Alice birthday'");
});
after(async () => { await db.close(); });

async function asUser<T>(authId: string | null, run: () => Promise<T>): Promise<T> {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [authId ?? ""]);
  await db.exec(authId ? "set role authenticated" : "set role anon");
  try { return await run(); } finally { await db.exec("reset role"); }
}

async function titles(authId: string | null, sql: string) {
  return asUser(authId, async () => (await db.query<{ v: string }>(sql)).rows.map((row) => row.v).sort());
}

test("personal transactions are visible only to their owner, family ones to accepted members", async () => {
  const sql = "select title as v from public.transactions";
  assert.deepEqual(await titles(auth.alice, sql), ["alice private", "family groceries"]);
  assert.deepEqual(await titles(auth.bob, sql), ["bob private", "family groceries"]);
  assert.deepEqual(await titles(auth.carol, sql), ["carol other family"], "a pending invite must not reveal family data");
  assert.deepEqual(await titles(auth.dave, sql), [], "a declined member sees nothing");
  assert.deepEqual(await titles(null, sql), [], "anonymous requests see nothing");
});

test("goals and the users table are owner-only", async () => {
  assert.deepEqual(await titles(auth.bob, "select name as v from public.goals"), ["bob goal"]);
  assert.deepEqual(await titles(auth.bob, "select name as v from public.users"), ["bob"]);
});

test("membership rows hide other people's pending invitations", async () => {
  const sql = "select u.name as v from public.family_members m join public.users u on u.id = m.user_id where m.family_group_id = '" + family + "'";
  // Joining users is limited by its own policy, so read IDs instead.
  const ids = await asUser(auth.alice, async () => (await db.query<{ user_id: string }>(`select user_id from public.family_members where family_group_id = '${family}'`)).rows.map((row) => row.user_id).sort());
  assert.deepEqual(ids, [app.alice, app.bob].sort());
  assert.deepEqual(await asUser(auth.carol, async () => (await db.query<{ invitation_status: string }>(`select invitation_status from public.family_members where family_group_id = '${family}'`)).rows), [{ invitation_status: "pending" }], "an invitee sees only their own invitation");
  assert.deepEqual(await titles(auth.alice, sql), ["alice"]);
});

test("wishlists follow membership, and wishlist items stay server-only", async () => {
  const sql = "select title as v from public.wishlists";
  assert.deepEqual(await titles(auth.alice, sql), ["Alice birthday", "Alice personal"]);
  assert.deepEqual(await titles(auth.bob, sql), ["Alice birthday"], "lists of an owner who left are hidden; personal lists are private");
  assert.deepEqual(await titles(auth.bob, "select name as v from public.wishlist_items"), []);
});

test("authenticated users cannot write any table directly", async () => {
  await asUser(auth.alice, async () => {
    await assert.rejects(db.query("insert into public.goals(user_id, name, target_amount) values ($1, 'sneaky', 1)", [app.alice]), /row-level security/);
    const updated = await db.query("update public.transactions set amount = 1 where title = 'alice private'");
    assert.equal(updated.affectedRows ?? 0, 0);
  });
});

test("the migration reruns cleanly and skips tables an environment never created", async () => {
  // Production never ran the optional billing migrations (0005/0006).
  await db.exec("drop table public.billing_invoices cascade");
  await db.exec(await readFile(new URL("../supabase/migrations/0023_rls_read_policies.sql", import.meta.url), "utf8"));
  assert.deepEqual(await titles(auth.alice, "select title as v from public.transactions"), ["alice private", "family groceries"]);
});

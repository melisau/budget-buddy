import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { after, before, test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

// Runs every migration in an in-process Postgres and pages through
// list_transactions_page the way the API does.
const db = new PGlite();
const a = "e0000000-0000-4000-8000-000000000001";
const b = "e0000000-0000-4000-8000-000000000002";
const c = "e0000000-0000-4000-8000-000000000003";
const family = "f0000000-0000-4000-8000-000000000001";
const pendingFamily = "f0000000-0000-4000-8000-000000000002";

type Row = { id: string; title: string; transaction_date: string; created_at: string };

async function page(limit: number, last?: Row, query: string | null = null) {
  const result = await db.query<{ v: Row[] }>(
    "select public.list_transactions_page($1, $2, $3, $4, $5, $6) as v",
    [a, limit, last?.transaction_date ?? null, last?.created_at ?? null, last?.id ?? null, query],
  );
  return result.rows[0].v;
}

before(async () => {
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz, banned_until timestamptz, raw_user_meta_data jsonb default '{}'::jsonb);
    create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
  `);
  const directory = new URL("../supabase/migrations/", import.meta.url);
  for (const file of (await readdir(directory)).filter((name) => name.endsWith(".sql")).sort()) {
    await db.exec(await readFile(new URL(file, directory), "utf8"));
  }
  await db.query("insert into public.users(id, email, name) values ($1, 'a@example.test', 'A'), ($2, 'b@example.test', 'B'), ($3, 'c@example.test', 'C')", [a, b, c]);
  await db.query("insert into public.family_groups(id, owner_user_id, name) values ($1, $2, 'F'), ($3, $4, 'G')", [family, b, pendingFamily, c]);
  await db.query(`insert into public.family_members(family_group_id, user_id, role, invitation_status) values
    ($1, $2, 'member', 'accepted'), ($1, $3, 'owner', 'accepted'), ($4, $2, 'member', 'pending')`, [family, a, b, pendingFamily]);
  // 60 rows share one date and one created_at, so only the id orders them.
  await db.query(`insert into public.transactions(user_id, type, amount, title, transaction_date, created_at)
    select $1, 'expense', 1, 'Own ' || g, date '2026-11-01', timestamptz '2026-11-01 10:00+00' from generate_series(1, 60) g`, [a]);
  await db.query(`insert into public.transactions(user_id, family_group_id, type, amount, title, transaction_date)
    select $1, $2, 'expense', 2, 'Family ' || g, date '2026-11-02' from generate_series(1, 5) g`, [b, family]);
  await db.query(`insert into public.transactions(user_id, family_group_id, type, amount, title, transaction_date) values
    ($1, null, 'expense', 3, 'B private', date '2026-11-03'),
    ($2, null, 'expense', 4, '50% off', date '2026-10-01'),
    ($2, null, 'expense', 4, '500 market', date '2026-10-01'),
    ($3, $4, 'expense', 5, 'Pending family', date '2026-11-04')`, [b, a, c, pendingFamily]);
});
after(async () => { await db.close(); });

test("pages return every visible transaction exactly once, newest first", async () => {
  const seen: Row[] = [];
  let last: Row | undefined;
  for (let guard = 0; guard < 50; guard++) {
    const rows = await page(8, last);
    if (!rows.length) break;
    seen.push(...rows);
    last = rows.at(-1);
  }
  assert.equal(seen.length, 67);
  assert.equal(new Set(seen.map((row) => row.id)).size, 67);
  assert.ok(seen[0].title.startsWith("Family "));
  assert.equal(seen.filter((row) => row.title.startsWith("Family ")).length, 5);
});

test("hides other users' personal rows and groups the user has not joined", async () => {
  const titles = (await page(101)).map((row) => row.title);
  assert.equal(titles.includes("B private"), false);
  assert.equal(titles.includes("Pending family"), false);
});

test("searches titles literally, including % and _", async () => {
  assert.deepEqual((await page(10, undefined, "50%")).map((row) => row.title), ["50% off"]);
  assert.deepEqual((await page(10, undefined, "50")).map((row) => row.title).sort(), ["50% off", "500 market", "Own 50"]);
  assert.equal((await page(10, undefined, "_")).length, 0);
});

test("caps the page size and stays server-only", async () => {
  assert.equal((await page(5000)).length, 67);
  const grant = await db.query<{ v: boolean }>("select has_function_privilege('authenticated', 'public.list_transactions_page(uuid, integer, date, timestamptz, uuid, text)', 'execute') as v");
  assert.equal(grant.rows[0].v, false);
});

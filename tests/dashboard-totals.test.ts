import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { after, before, test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
const alice = "b0000000-0000-4000-8000-000000000001";
const bob = "b0000000-0000-4000-8000-000000000002";
const family = "c0000000-0000-4000-8000-000000000001";
const tryAccount = "d0000000-0000-4000-8000-000000000001";
const eurAccount = "d0000000-0000-4000-8000-000000000002";
const secondTry = "d0000000-0000-4000-8000-000000000003";
const food = "e0000000-0000-4000-8000-000000000001";

type Totals = { balance: number; income: number; expenses: number; categories: { name: string; value: number }[]; cashFlow: { month: string; income: number; expense: number }[] };

async function totals(user: string, familyId: string | null, account: string | null, currency = "TRY") {
  const { rows } = await db.query<{ result: Totals }>(
    "select public.dashboard_totals($1, $2, $3, $4, '2026-03-01', '2026-03-31', '2025-10-01') as result",
    [user, familyId, account, currency],
  );
  return rows[0].result;
}

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
  await db.query("insert into public.users(id, email, name) values ($1, 'a@example.test', 'a'), ($2, 'b@example.test', 'b')", [alice, bob]);
  await db.query("insert into public.family_groups(id, owner_user_id, name) values ($1, $2, 'Home')", [family, alice]);
  await db.query(`insert into public.accounts(id, user_id, name, type, currency) values
    ($1, $4, 'Main', 'cash', 'TRY'), ($2, $4, 'Euro', 'cash', 'EUR'), ($3, $4, 'Second', 'cash', 'TRY')`, [tryAccount, eurAccount, secondTry, alice]);
  await db.query("insert into public.categories(id, user_id, name, type) values ($1, $2, 'Food', 'expense')", [food, alice]);
  await db.query(`insert into public.transactions(user_id, account_id, category_id, family_group_id, type, amount, title, transaction_date) values
    ($1, $2, null, null, 'income', 1000.10, 'salary', '2026-03-05'),
    ($1, $2, $5, null, 'expense', 200.20, 'market', '2026-03-06'),
    ($1, $2, null, null, 'expense', 50, 'other', '2026-03-07'),
    ($1, $3, $5, null, 'expense', 25, 'second', '2026-03-08'),
    ($1, $2, null, null, 'income', 500, 'previous', '2026-02-10'),
    ($1, $2, null, null, 'income', 999, 'future', '2026-04-01'),
    ($1, $4, null, null, 'expense', 70, 'euro', '2026-03-09'),
    ($1, null, null, null, 'expense', 11, 'no account', '2026-03-09'),
    ($1, $2, null, $6, 'expense', 40, 'family', '2026-03-10'),
    ($7, $2, null, null, 'income', 123, 'bob', '2026-03-11')`, [alice, tryAccount, secondTry, eurAccount, food, family, bob]);
});

after(async () => { await db.close(); });

test("personal totals keep the dashboard's month, balance, and currency rules", async () => {
  const result = await totals(alice, null, null);
  assert.equal(result.income, 1000.1);
  assert.equal(result.expenses, 275.2);
  assert.equal(result.balance, 1224.9);
  assert.deepEqual(result.categories, [{ name: "Food", value: 225.2 }, { name: "Uncategorized", value: 50 }]);
  assert.deepEqual(result.cashFlow, [
    { month: "2026-02", income: 500, expense: 0 },
    { month: "2026-03", income: 1000.1, expense: 275.2 },
  ]);
});

test("account, currency, and family filters are applied", async () => {
  assert.equal((await totals(alice, null, secondTry)).expenses, 25);
  assert.equal((await totals(alice, null, null, "EUR")).expenses, 70);
  const shared = await totals(bob, family, null);
  assert.equal(shared.expenses, 40);
  assert.equal(shared.income, 0);
});

test("family accounts come only from that family's transactions", async () => {
  const { rows } = await db.query<{ id: string }>("select id from public.dashboard_family_accounts($1)", [family]);
  assert.deepEqual(rows.map((row) => row.id), [tryAccount]);
});

test("only the server role can execute the functions", async () => {
  for (const role of ["anon", "authenticated"]) {
    const { rows } = await db.query<{ totals: boolean; accounts: boolean }>(
      `select has_function_privilege($1, 'public.dashboard_totals(uuid, uuid, uuid, text, date, date, date)', 'execute') as totals,
              has_function_privilege($1, 'public.dashboard_family_accounts(uuid)', 'execute') as accounts`,
      [role],
    );
    assert.deepEqual(rows[0], { totals: false, accounts: false });
  }
});

import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { after, before, test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { isSameTransaction, readIdempotencyKey } from "../lib/finance/idempotency.ts";

const key = "3f8e2a10-5c4b-4d2e-9a1f-7b6c5d4e3f21";

test("reads a UUID key and ignores a missing one", () => {
  assert.equal(readIdempotencyKey(new Headers({ "Idempotency-Key": key.toUpperCase() })), key);
  assert.equal(readIdempotencyKey(new Headers()), null);
  assert.equal(readIdempotencyKey(new Headers({ "Idempotency-Key": "retry-1" })), "invalid");
});

test("a replay must describe the same transaction", () => {
  const stored = { type: "expense", amount: "125.50", title: "Market", transaction_date: "2026-11-24" };
  assert.equal(isSameTransaction(stored, { type: "expense", amount: 125.5, title: "Market", date: "2026-11-24" }), true);
  assert.equal(isSameTransaction(stored, { type: "expense", amount: 126, title: "Market", date: "2026-11-24" }), false);
});

const db = new PGlite();
const users = ["90000000-0000-4000-8000-000000000001", "90000000-0000-4000-8000-000000000002"];

before(async () => {
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz, banned_until timestamptz, raw_user_meta_data jsonb default '{}'::jsonb);
    create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
  `);
  const directory = new URL("../supabase/migrations/", import.meta.url);
  for (const file of (await readdir(directory)).filter((name) => name.endsWith(".sql")).sort()) {
    await db.exec(await readFile(new URL(file, directory), "utf8"));
  }
  await db.query("insert into public.users(id, email, name) values ($1, 'a@example.test', 'A'), ($2, 'b@example.test', 'B')", users);
});
after(async () => { await db.close(); });

const insert = (user: string, requestId: string | null) => db.query(
  "insert into public.transactions(user_id, type, amount, title, transaction_date, client_request_id) values ($1, 'expense', 10, 'Market', current_date, $2)",
  [user, requestId],
);

test("the database stores one transaction per user and request ID", async () => {
  await insert(users[0], key);
  await assert.rejects(insert(users[0], key), (error: { code?: string }) => error.code === "23505");
  await insert(users[1], key);
  await insert(users[0], null);
  await insert(users[0], null);
  const count = await db.query<{ n: number }>("select count(*)::int as n from public.transactions");
  assert.equal(count.rows[0].n, 4);
});

import assert from "node:assert/strict";
import test from "node:test";
import { transactionRequestSchema } from "../validations/transaction.ts";

const base = { type: "income", amount: 180, title: "Maaş", category: "6f1c2a3b-1d2e-4f5a-8b9c-0d1e2f3a4b5c", date: "2026-11-13" };

test("transactions can be saved without an account", () => {
  assert.equal(transactionRequestSchema.parse(base).account, undefined);
  assert.equal(transactionRequestSchema.parse({ ...base, account: "" }).account, undefined);
});

test("a chosen account must still be a valid id", () => {
  const account = "7a2b3c4d-5e6f-4a1b-9c2d-3e4f5a6b7c8d";
  assert.equal(transactionRequestSchema.parse({ ...base, account }).account, account);
  assert.throws(() => transactionRequestSchema.parse({ ...base, account: "nope" }));
});

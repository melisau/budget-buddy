import assert from "node:assert/strict";
import { test } from "node:test";
import { defaultAccountFromRpc } from "../lib/finance/default-account-result.ts";

test("returns the default account ID", () => {
  assert.equal(defaultAccountFromRpc({ data: "account-1", error: null }), "account-1");
});

test("keeps working before the migration is applied", () => {
  assert.equal(defaultAccountFromRpc({ data: null, error: { code: "PGRST202" } }), null);
});

test("does not hide other database errors", () => {
  assert.throws(() => defaultAccountFromRpc({ data: null, error: { code: "XX000", message: "failed" } }), /failed/);
});

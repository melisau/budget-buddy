import assert from "node:assert/strict";
import test from "node:test";
import { monthBounds, monthTotals } from "../lib/finance/total-budget-math.ts";

test("month bounds cover the whole month, leap years included", () => {
  assert.deepEqual(monthBounds("2028-02"), { start: "2028-02-01", end: "2028-02-29" });
  assert.equal(monthBounds("2026-13"), null);
});

test("transfers between own accounts are neither spending nor income", () => {
  assert.deepEqual(monthTotals([
    { type: "expense", amount: "120.50", transfer_group_id: null },
    { type: "income", amount: 3000, transfer_group_id: null },
    { type: "expense", amount: 500, transfer_group_id: "t1" },
    { type: "income", amount: 500, transfer_group_id: "t1" },
  ]), { spent: 120.5, income: 3000 });
});

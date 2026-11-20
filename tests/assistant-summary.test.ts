import assert from "node:assert/strict";
import test from "node:test";
import { buildAssistantSummary, CUSTOM_CATEGORY_LABEL } from "../lib/finance/assistant-summary.ts";

const rows = [
  { type: "income", amount: "1000.00", transaction_date: "2026-11-01", category: { name: "Salary" }, title: "Maaş - Ahmet Yılmaz", note: "IBAN TR00" },
  { type: "expense", amount: "0.10", transaction_date: "2026-11-02", category: { name: "Groceries" }, title: "Migros" },
  { type: "expense", amount: "0.20", transaction_date: "2026-11-03", category: [{ name: "Groceries" }], title: "Migros", family_group_id: "family-1" },
  { type: "expense", amount: "50", transaction_date: "2026-10-15", category: { name: "Ayşe'nin ilaçları" }, title: "Dr. Ayşe Kaya" },
  { type: "expense", amount: "999", transaction_date: "2025-01-01", category: { name: "Travel" }, title: "Old trip" },
  { type: "transfer", amount: "300", transaction_date: "2026-11-04", category: null, title: "To savings" },
];

test("assistant summary contains no titles, notes or custom category names", () => {
  const text = JSON.stringify(buildAssistantSummary(rows, "2026-11-20"));
  for (const secret of ["Ahmet", "IBAN", "Migros", "Ayşe", "Old trip", "To savings", "family-1"]) {
    assert.equal(text.includes(secret), false, `summary leaked "${secret}"`);
  }
  assert.ok(text.includes(CUSTOM_CATEGORY_LABEL));
});

test("assistant summary aggregates the last 12 months in exact cents", () => {
  const summary = buildAssistantSummary(rows, "2026-11-20");
  assert.equal(summary.transactionCount, 4);
  assert.deepEqual(summary.period, { fromMonth: "2025-12", toMonth: "2026-11" });
  assert.deepEqual(summary.totals, { income: 1000, expense: 50.3, net: 949.7, savingsRatePercent: 95 });
  assert.deepEqual(summary.expenseByScope, { personal: 50.1, family: 0.2 });
  assert.deepEqual(summary.months, [
    { month: "2026-10", income: 0, expense: 50 },
    { month: "2026-11", income: 1000, expense: 0.3 },
  ]);
  assert.deepEqual(summary.categories.find((item) => item.category === "Groceries"), { category: "Groceries", type: "expense", total: 0.3, count: 2 });
});

test("assistant summary handles no data", () => {
  const summary = buildAssistantSummary([], "2026-01-05");
  assert.equal(summary.period.fromMonth, "2025-02");
  assert.equal(summary.totals.savingsRatePercent, null);
  assert.deepEqual(summary.categories, []);
});

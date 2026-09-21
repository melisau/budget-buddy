import assert from "node:assert/strict";
import test from "node:test";
import { calculateBalance, calculateBudgetUsage, calculateSavingsRate, getBudgetStatus } from "../lib/finance/calculations.ts";
import type { FinanceTransaction } from "../types/finance.ts";

const transaction = (type: "income" | "expense", amount: number): FinanceTransaction => ({
  id: `${type}-${amount}`,
  title: "Test",
  category: "Test",
  accountName: "Test",
  transactionDate: "2026-09-21",
  amount,
  type,
});

test("balance combines income and expenses", () => {
  assert.equal(calculateBalance([transaction("income", 4_000), transaction("expense", 1_250)]), 2_750);
});

test("budget usage and thresholds match product rules", () => {
  assert.equal(calculateBudgetUsage({ category: "Food", spent: 720, limit: 1_000 }), 72);
  assert.equal(getBudgetStatus(69), "safe");
  assert.equal(getBudgetStatus(70), "approaching");
  assert.equal(getBudgetStatus(90), "critical");
  assert.equal(getBudgetStatus(100), "exceeded");
});

test("savings rate stays meaningful for missing income and overspending", () => {
  assert.equal(calculateSavingsRate(10_000, 2_500), 75);
  assert.equal(calculateSavingsRate(0, 2_500), 0);
  assert.equal(calculateSavingsRate(1_000, 1_500), 0);
});

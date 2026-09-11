import type { BudgetStatus, BudgetSummary, FinanceTransaction } from "@/types/finance";

export function calculateBalance(transactions: FinanceTransaction[]) {
  return transactions.reduce(
    (balance, transaction) =>
      transaction.type === "income" ? balance + transaction.amount : balance - transaction.amount,
    0,
  );
}

export function calculateBudgetUsage(budget: BudgetSummary) {
  if (budget.limit <= 0) return 0;
  return Math.round((budget.spent / budget.limit) * 100);
}

export function getBudgetStatus(usage: number): BudgetStatus {
  if (usage >= 100) return "exceeded";
  if (usage >= 90) return "critical";
  if (usage >= 70) return "approaching";
  return "safe";
}

export function calculateSavingsRate(income: number, expenses: number) {
  if (income <= 0) return 0;
  return Math.max(0, ((income - expenses) / income) * 100);
}

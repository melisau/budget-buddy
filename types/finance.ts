export type Currency = "TRY" | "EUR" | "USD" | "GBP";

export type TransactionType = "income" | "expense";

export type BudgetStatus = "safe" | "approaching" | "critical" | "exceeded";

export interface FinanceTransaction {
  id: string;
  title: string;
  category: string;
  accountName: string;
  transactionDate: string;
  amount: number;
  type: TransactionType;
}

export interface BudgetSummary {
  category: string;
  spent: number;
  limit: number;
}

export interface FamilyReceiptDraft {
  name: string;
  previewUrl: string;
  size: number;
}

import { Car, House, Lightbulb, ShoppingBag, Utensils, WalletCards } from "lucide-react";
import type { BudgetRowData, DemoTransaction } from "@/components/budgetbuddy/shared";

export const cashFlow = [
  { m: "Apr", income: 43, expense: 29 },
  { m: "May", income: 46, expense: 31 },
  { m: "Jun", income: 45, expense: 30 },
  { m: "Jul", income: 49, expense: 32 },
  { m: "Aug", income: 51, expense: 34 },
  { m: "Sep", income: 55, expense: 30.7 },
];

export const spendingCategories = [
  ["Rent", 15000, "#5267df", House],
  ["Groceries", 5400, "#f18470", Utensils],
  ["Dining", 3200, "#8b9cf5", Utensils],
  ["Shopping", 2800, "#e8b84f", ShoppingBag],
  ["Transport", 2300, "#54b39a", Car],
  ["Utilities", 2000, "#c5cbdc", Lightbulb],
] as const;

export const demoTransactions = [
  ["Rent payment", "Housing", "Today, 09:00", -15000, House],
  ["Salary", "Income", "Sep 8, 09:00", 55000, WalletCards],
  ["Migros Market", "Groceries", "Sep 7, 18:30", -1850, Utensils],
  ["Shell", "Transport", "Sep 6, 12:10", -930, Car],
  ["Coffee Shop", "Dining", "Sep 6, 10:12", -185, Utensils],
] as const satisfies ReadonlyArray<DemoTransaction>;

export const demoBudgets = [
  ["Food & Dining", 8600, 10000, "Approaching limit", "amber"],
  ["Housing", 15000, 17000, "Approaching limit", "amber"],
  ["Shopping", 2800, 4000, "Safe", "green"],
  ["Entertainment", 1280, 1200, "Exceeded", "red"],
] as const satisfies ReadonlyArray<BudgetRowData>;

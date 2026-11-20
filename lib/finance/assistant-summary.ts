import { defaultCategoryNamesTr } from "./category-names.ts";

// Builds the only financial data the AI assistant receives. It is an
// aggregate: totals per month and per category, with no titles, notes,
// account names, receipts, dates of single transactions or user IDs.
// Custom category names are free text the user typed, so they are grouped
// under one label instead of being sent.

export type AssistantSourceTransaction = {
  type: string;
  amount: number | string;
  transaction_date: string;
  family_group_id?: string | null;
  category?: { name: string } | { name: string }[] | null;
};

export const CUSTOM_CATEGORY_LABEL = "Other (custom categories)";
const MONTHS = 12;

type Totals = { income: number; expense: number };

const toCents = (value: number | string) => Math.round(Number(value) * 100);
const fromCents = (cents: number) => cents / 100;

function categoryLabel(category: AssistantSourceTransaction["category"]): string {
  const record = Array.isArray(category) ? category[0] : category;
  if (!record) return "Uncategorized";
  return Object.hasOwn(defaultCategoryNamesTr, record.name) ? record.name : CUSTOM_CATEGORY_LABEL;
}

function monthsBack(today: string, count: number): string {
  const [year, month] = today.slice(0, 7).split("-").map(Number);
  const index = year * 12 + (month - 1) - (count - 1);
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

export function buildAssistantSummary(transactions: AssistantSourceTransaction[], today = new Date().toISOString().slice(0, 10)) {
  const fromMonth = monthsBack(today, MONTHS);
  const months = new Map<string, Totals>();
  const categories = new Map<string, { type: "income" | "expense"; cents: number; count: number }>();
  const totals: Totals = { income: 0, expense: 0 };
  const expenseByScope = { personal: 0, family: 0 };
  let count = 0;

  for (const item of transactions) {
    if (item.type !== "income" && item.type !== "expense") continue;
    const month = item.transaction_date.slice(0, 7);
    if (month < fromMonth || month > today.slice(0, 7)) continue;
    const cents = toCents(item.amount);
    if (!Number.isFinite(cents)) continue;

    count += 1;
    totals[item.type] += cents;
    const monthTotals = months.get(month) ?? { income: 0, expense: 0 };
    monthTotals[item.type] += cents;
    months.set(month, monthTotals);

    const label = categoryLabel(item.category);
    const key = `${item.type}:${label}`;
    const entry = categories.get(key) ?? { type: item.type, cents: 0, count: 0 };
    entry.cents += cents;
    entry.count += 1;
    categories.set(key, entry);

    if (item.type === "expense") expenseByScope[item.family_group_id ? "family" : "personal"] += cents;
  }

  return {
    currency: "TRY",
    period: { fromMonth, toMonth: today.slice(0, 7) },
    transactionCount: count,
    totals: {
      income: fromCents(totals.income),
      expense: fromCents(totals.expense),
      net: fromCents(totals.income - totals.expense),
      savingsRatePercent: totals.income > 0 ? Math.round(((totals.income - totals.expense) / totals.income) * 100) : null,
    },
    expenseByScope: { personal: fromCents(expenseByScope.personal), family: fromCents(expenseByScope.family) },
    months: [...months.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([month, value]) => ({ month, income: fromCents(value.income), expense: fromCents(value.expense) })),
    categories: [...categories.entries()]
      .sort(([, left], [, right]) => right.cents - left.cents)
      .map(([key, value]) => ({ category: key.slice(key.indexOf(":") + 1), type: value.type, total: fromCents(value.cents), count: value.count })),
  };
}

import "server-only";
import type { AppUser } from "@/lib/auth/authorization";
import { calculateBudgetUsage, getBudgetStatus } from "@/lib/finance/calculations";
import { isMissingSchemaError } from "@/lib/supabase/schema-errors";
import { fetchAllRows } from "@/lib/supabase/query";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { monthBounds, monthTotals } from "@/lib/finance/total-budget-math";

export type TotalBudget = {
  available: boolean;
  month: string;
  /** The overall spending limit for the month, or null when none is set. */
  limit: number | null;
  /** Personal expenses this month, transfers between own accounts excluded. */
  spent: number;
  /** Personal income this month, transfers excluded. */
  income: number;
  usage: number;
  status: ReturnType<typeof getBudgetStatus>;
  currency: string;
};

export async function getTotalBudget(user: AppUser, month: string): Promise<TotalBudget> {
  const bounds = monthBounds(month);
  if (!bounds) throw new Error("Invalid month.");
  const supabase = getSupabaseServerClient();
  const [budget, profile, transactions] = await Promise.all([
    supabase.from("monthly_total_budgets").select("amount_limit").eq("user_id", user.id).eq("start_date", bounds.start).maybeSingle(),
    supabase.from("users").select("currency").eq("id", user.id).single(),
    fetchAllRows<{ type: string; amount: number | string; transfer_group_id: string | null }>(() => supabase.from("transactions")
      .select("id, type, amount, transfer_group_id").eq("user_id", user.id).is("family_group_id", null)
      .gte("transaction_date", bounds.start).lte("transaction_date", bounds.end)),
  ]);
  if (profile.error) throw profile.error;
  if (transactions.error) throw transactions.error;
  const available = !isMissingSchemaError(budget.error);
  if (budget.error && available) throw budget.error;
  const { spent, income } = monthTotals(transactions.data);
  const limit = available && budget.data ? Number(budget.data.amount_limit) : null;
  const usage = limit ? calculateBudgetUsage({ category: "", spent, limit }) : 0;
  return { available, month, limit, spent, income, usage, status: getBudgetStatus(usage), currency: (profile.data.currency as string) ?? "TRY" };
}

export async function setTotalBudget(user: AppUser, month: string, amountLimit: number) {
  const bounds = monthBounds(month);
  if (!bounds) throw new Error("Invalid month.");
  const { error } = await getSupabaseServerClient().from("monthly_total_budgets")
    .upsert({ user_id: user.id, start_date: bounds.start, amount_limit: amountLimit, updated_at: new Date().toISOString() }, { onConflict: "user_id,start_date" });
  if (error) throw error;
}

export async function removeTotalBudget(user: AppUser, month: string) {
  const bounds = monthBounds(month);
  if (!bounds) throw new Error("Invalid month.");
  const { error } = await getSupabaseServerClient().from("monthly_total_budgets").delete().eq("user_id", user.id).eq("start_date", bounds.start);
  if (error) throw error;
}

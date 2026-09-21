import { NextResponse } from "next/server";
import { AccessError, requireAppUser } from "@/lib/auth/authorization";
import { calculateBudgetUsage, calculateSavingsRate, getBudgetStatus } from "@/lib/finance/calculations";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Currency } from "@/types/finance";

const currencies: Currency[] = ["TRY", "EUR", "USD", "GBP"];
type Account = { id: string; name: string; currency: Currency };
type Transaction = { id: string; title: string; type: "income" | "expense"; amount: number | string; transaction_date: string; account_id: string | null; account: Account | Account[] | null; category: { id: string; name: string } | { id: string; name: string }[] | null };
function relation<T>(value: T | T[] | null) { return Array.isArray(value) ? value[0] ?? null : value; }
function monthKeys(endMonth: string, count: number) { const [year, month] = endMonth.split("-").map(Number); return Array.from({ length: count }, (_, index) => { const date = new Date(Date.UTC(year, month - count + index, 1)); return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`; }); }
function errorResponse(error: unknown) { if (error instanceof AccessError) return NextResponse.json({ error: error.message }, { status: error.status }); console.error("[analytics] request failed", error); return NextResponse.json({ error: "Unable to load analytics." }, { status: 500 }); }

export async function GET(request: Request) {
  try {
    const user = await requireAppUser(); const params = new URL(request.url).searchParams; const supabase = getSupabaseServerClient();
    const requestedMonth = params.get("month") ?? new Date().toISOString().slice(0, 7); const endMonth = /^\d{4}-(0[1-9]|1[0-2])$/.test(requestedMonth) ? requestedMonth : new Date().toISOString().slice(0, 7);
    const requestedPeriod = Number(params.get("period") ?? 6); const period = [1, 3, 6, 12].includes(requestedPeriod) ? requestedPeriod : 6;
    const requestedCurrency = params.get("currency") as Currency | null; const currency: Currency = requestedCurrency && currencies.includes(requestedCurrency) ? requestedCurrency : "TRY";
    const scope = params.get("scope") ?? "personal"; const requestedAccountId = params.get("account") ?? "all";
    const [accountsResult, membershipsResult, userResult] = await Promise.all([
      supabase.from("accounts").select("id, name, currency").eq("user_id", user.id).is("archived_at", null).order("name"),
      supabase.from("family_members").select("family_group_id, group:family_groups(id, name)").eq("user_id", user.id).eq("invitation_status", "accepted"),
      supabase.from("users").select("currency").eq("id", user.id).single(),
    ]);
    if (accountsResult.error || membershipsResult.error || userResult.error) throw accountsResult.error ?? membershipsResult.error ?? userResult.error;
    const ownAccounts = (accountsResult.data ?? []) as Account[];
    const familyGroups = (membershipsResult.data ?? []).map((membership) => relation(membership.group)).filter((group): group is { id: string; name: string } => Boolean(group));
    const familyId = scope.startsWith("family:") ? scope.slice(7) : null;
    if (familyId && !familyGroups.some((group) => group.id === familyId)) throw new AccessError("Family group not found.", 404);
    let transactionQuery = supabase.from("transactions").select("id, title, type, amount, transaction_date, account_id, account:accounts(id, name, currency), category:categories(id, name)");
    transactionQuery = familyId ? transactionQuery.eq("family_group_id", familyId) : transactionQuery.eq("user_id", user.id).is("family_group_id", null);
    const transactionResult = await transactionQuery.order("transaction_date", { ascending: false });
    if (transactionResult.error) throw transactionResult.error;
    const allTransactions = (transactionResult.data ?? []) as Transaction[];
    const availableAccounts: Account[] = familyId ? [...new Map(allTransactions.map((item) => relation(item.account)).filter((item): item is Account => Boolean(item)).map((item) => [item.id, item])).values()] : ownAccounts;
    const selectedAccount = requestedAccountId === "all" ? null : availableAccounts.find((account) => account.id === requestedAccountId);
    const effectiveCurrency = selectedAccount?.currency ?? currency;
    const filtered = allTransactions.filter((item) => relation(item.account)?.currency === effectiveCurrency && (!selectedAccount || item.account_id === selectedAccount.id));
    const keys = monthKeys(endMonth, period); const firstDate = `${keys[0]}-01`; const [year, month] = endMonth.split("-").map(Number); const lastDate = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
    const ranged = filtered.filter((item) => item.transaction_date >= firstDate && item.transaction_date <= lastDate);
    const monthly = keys.map((key) => { const items = ranged.filter((item) => item.transaction_date.startsWith(key)); return { month: key, income: items.filter((item) => item.type === "income").reduce((sum, item) => sum + Number(item.amount), 0), expense: items.filter((item) => item.type === "expense").reduce((sum, item) => sum + Number(item.amount), 0) }; });
    const current = monthly.at(-1) ?? { income: 0, expense: 0 }; const currentItems = ranged.filter((item) => item.transaction_date.startsWith(endMonth));
    const largest = currentItems.filter((item) => item.type === "expense").sort((a, b) => Number(b.amount) - Number(a.amount)).slice(0, 5).map((item) => ({ id: item.id, title: item.title, category: relation(item.category)?.name ?? "Uncategorized", amount: Number(item.amount), date: item.transaction_date }));
    let budgets: { id: string; categoryName: string; spent: number; limit: number; usage: number; status: ReturnType<typeof getBudgetStatus> }[] = [];
    if (!familyId && userResult.data.currency === effectiveCurrency) {
      const { data: rows, error } = await supabase.from("budgets").select("id, category_id, amount_limit, category:categories(name)").eq("user_id", user.id).is("family_group_id", null).eq("start_date", `${endMonth}-01`);
      if (error) throw error;
      budgets = (rows ?? []).map((budget) => { const spent = currentItems.filter((item) => item.type === "expense" && relation(item.category)?.id === budget.category_id).reduce((sum, item) => sum + Number(item.amount), 0); const limit = Number(budget.amount_limit); const usage = calculateBudgetUsage({ category: "", spent, limit }); return { id: budget.id, categoryName: relation(budget.category)?.name ?? "Uncategorized", spent, limit, usage, status: getBudgetStatus(usage) }; });
    }
    return NextResponse.json({ filters: { month: endMonth, period, scope: familyId ? scope : "personal", accountId: selectedAccount?.id ?? "all", currency: effectiveCurrency, budgetCurrency: userResult.data.currency, accounts: availableAccounts, familyGroups, currencies }, summary: { income: current.income, expenses: current.expense, savingsRate: calculateSavingsRate(current.income, current.expense) }, monthly, largest, budgets });
  } catch (error) { return errorResponse(error); }
}

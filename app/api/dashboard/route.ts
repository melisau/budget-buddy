import { NextResponse } from "next/server";
import { AccessError, requireAppUser } from "@/lib/auth/authorization";
import { calculateSavingsRate } from "@/lib/finance/calculations";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Currency } from "@/types/finance";

const currencies: Currency[] = ["TRY", "EUR", "USD", "GBP"];
const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
type Account = { id: string; name: string; currency: Currency; initial_balance: number | string };
type Transaction = { id: string; title: string; type: "income" | "expense"; amount: number | string; transaction_date: string; account_id: string | null; account: { id: string; name: string; currency: Currency } | { id: string; name: string; currency: Currency }[] | null; category: { name: string } | { name: string }[] | null };

function relation<T>(value: T | T[] | null) { return Array.isArray(value) ? value[0] ?? null : value; }
function monthRange(month: string) { const [year, number] = month.split("-").map(Number); return { start: `${month}-01`, end: new Date(Date.UTC(year, number, 0)).toISOString().slice(0, 10) }; }
function previousMonths(month: string) { const [year, number] = month.split("-").map(Number); return Array.from({ length: 6 }, (_, index) => { const date = new Date(Date.UTC(year, number - 1 - (5 - index), 1)); return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`; }); }
function errorResponse(error: unknown) { if (error instanceof AccessError) return NextResponse.json({ error: error.message }, { status: error.status }); console.error("[dashboard] request failed", error); return NextResponse.json({ error: "Unable to load dashboard." }, { status: 500 }); }

export async function GET(request: Request) {
  try {
    const user = await requireAppUser();
    const params = new URL(request.url).searchParams;
    const requestedMonth = params.get("month") ?? new Date().toISOString().slice(0, 7);
    const month = monthPattern.test(requestedMonth) ? requestedMonth : new Date().toISOString().slice(0, 7);
    const scope = params.get("scope") ?? "personal";
    const requestedCurrency = params.get("currency") as Currency | null;
    const currency: Currency = requestedCurrency && currencies.includes(requestedCurrency) ? requestedCurrency : "TRY";
    const requestedAccountId = params.get("account") ?? "all";
    const supabase = getSupabaseServerClient();
    const [accountsResult, membershipsResult] = await Promise.all([
      supabase.from("accounts").select("id, name, currency, initial_balance").eq("user_id", user.id).is("archived_at", null).order("name"),
      supabase.from("family_members").select("family_group_id, group:family_groups(id, name)").eq("user_id", user.id).eq("invitation_status", "accepted"),
    ]);
    if (accountsResult.error || membershipsResult.error) throw accountsResult.error ?? membershipsResult.error;
    const ownAccounts = (accountsResult.data ?? []) as Account[];
    const familyGroups = (membershipsResult.data ?? []).map((membership) => relation(membership.group)).filter((group): group is { id: string; name: string } => Boolean(group));
    const familyId = scope.startsWith("family:") ? scope.slice(7) : null;
    if (familyId && !familyGroups.some((group) => group.id === familyId)) throw new AccessError("Family group not found.", 404);

    let transactionQuery = supabase.from("transactions").select("id, title, type, amount, transaction_date, account_id, account:accounts(id, name, currency), category:categories(name)");
    transactionQuery = familyId ? transactionQuery.eq("family_group_id", familyId) : transactionQuery.eq("user_id", user.id).is("family_group_id", null);
    const transactionResult = await transactionQuery.order("transaction_date", { ascending: false }).order("created_at", { ascending: false });
    if (transactionResult.error) throw transactionResult.error;
    const allTransactions = (transactionResult.data ?? []) as Transaction[];
    const availableAccounts = familyId
      ? [...new Map(allTransactions.map((item) => relation(item.account)).filter((account): account is NonNullable<ReturnType<typeof relation<{ id: string; name: string; currency: Currency }>>> => Boolean(account)).map((account) => [account.id, account])).values()]
      : ownAccounts.map(({ id, name, currency: accountCurrency }) => ({ id, name, currency: accountCurrency }));
    const selectedAccount = requestedAccountId === "all" ? null : availableAccounts.find((account) => account.id === requestedAccountId);
    const effectiveCurrency = selectedAccount?.currency ?? currency;
    const filtered = allTransactions.filter((item) => relation(item.account)?.currency === effectiveCurrency && (!selectedAccount || item.account_id === selectedAccount.id));
    const { start, end } = monthRange(month);
    const monthTransactions = filtered.filter((item) => item.transaction_date >= start && item.transaction_date <= end);
    const income = monthTransactions.filter((item) => item.type === "income").reduce((sum, item) => sum + Number(item.amount), 0);
    const expenses = monthTransactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + Number(item.amount), 0);
    const openingBalance = familyId ? 0 : ownAccounts.filter((account) => account.currency === effectiveCurrency && (!selectedAccount || account.id === selectedAccount.id)).reduce((sum, account) => sum + Number(account.initial_balance), 0);
    const balance = openingBalance + filtered.filter((item) => item.transaction_date <= end).reduce((sum, item) => sum + (item.type === "income" ? Number(item.amount) : -Number(item.amount)), 0);
    const categoryTotals = new Map<string, number>();
    for (const item of monthTransactions.filter((entry) => entry.type === "expense")) { const name = relation(item.category)?.name ?? "Uncategorized"; categoryTotals.set(name, (categoryTotals.get(name) ?? 0) + Number(item.amount)); }
    const cashFlow = previousMonths(month).map((value) => { const entries = filtered.filter((item) => item.transaction_date.startsWith(value)); return { month: value, income: entries.filter((item) => item.type === "income").reduce((sum, item) => sum + Number(item.amount), 0), expense: entries.filter((item) => item.type === "expense").reduce((sum, item) => sum + Number(item.amount), 0) }; });
    return NextResponse.json({ filters: { month, scope: familyId ? scope : "personal", accountId: selectedAccount?.id ?? "all", currency: effectiveCurrency, accounts: availableAccounts, familyGroups, currencies }, summary: { balance, income, expenses, savingsRate: calculateSavingsRate(income, expenses) }, categories: [...categoryTotals].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value), recent: monthTransactions.slice(0, 5), cashFlow });
  } catch (error) { return errorResponse(error); }
}

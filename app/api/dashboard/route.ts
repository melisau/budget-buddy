import { NextResponse } from "next/server";
import { AccessError, requireAppUser } from "@/lib/auth/authorization";
import { materializeDueRecurringSafely } from "@/lib/finance/recurring-service";
import { calculateSavingsRate } from "@/lib/finance/calculations";
import { createServerTiming } from "@/lib/observability/server-timing";
import { fetchAllRows } from "@/lib/supabase/query";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Currency } from "@/types/finance";

const currencies: Currency[] = ["TRY", "EUR", "USD", "GBP"];
const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
type Account = { id: string; name: string; currency: Currency; initial_balance: number | string };
type Transaction = { id: string; title: string; type: "income" | "expense"; amount: number | string; transaction_date: string; account_id: string | null; account: { id: string; name: string; currency: Currency } | { id: string; name: string; currency: Currency }[] | null; category: { name: string } | { name: string }[] | null };

function relation<T>(value: T | T[] | null) { return Array.isArray(value) ? value[0] ?? null : value; }
function monthRange(month: string) { const [year, number] = month.split("-").map(Number); return { start: `${month}-01`, end: new Date(Date.UTC(year, number, 0)).toISOString().slice(0, 10) }; }
function previousMonths(month: string) { const [year, number] = month.split("-").map(Number); return Array.from({ length: 6 }, (_, index) => { const date = new Date(Date.UTC(year, number - 1 - (5 - index), 1)); return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`; }); }
type AccountOption = { id: string; name: string; currency: Currency };
type Totals = { balance: number | string; income: number | string; expenses: number | string; categories: { name: string; value: number | string }[]; cashFlow: { month: string; income: number | string; expense: number | string }[] };
function isMissingFunction(error: unknown) { return (error as { code?: string } | null | undefined)?.code === "PGRST202"; }
function totalsFromRows(rows: Transaction[], start: string, end: string): Totals {
  const totals = { balance: 0, income: 0, expenses: 0 };
  const categories = new Map<string, number>();
  const flow = new Map<string, { month: string; income: number; expense: number }>();
  for (const item of rows) {
    if (item.transaction_date > end) continue;
    const amount = Number(item.amount);
    totals.balance += item.type === "income" ? amount : -amount;
    const key = item.transaction_date.slice(0, 7);
    const entry = flow.get(key) ?? { month: key, income: 0, expense: 0 };
    if (item.type === "income") entry.income += amount; else entry.expense += amount;
    flow.set(key, entry);
    if (item.transaction_date < start) continue;
    if (item.type === "income") totals.income += amount;
    else { totals.expenses += amount; const name = relation(item.category)?.name ?? "Uncategorized"; categories.set(name, (categories.get(name) ?? 0) + amount); }
  }
  return { ...totals, categories: [...categories].map(([name, value]) => ({ name, value })), cashFlow: [...flow.values()] };
}
function errorResponse(error: unknown) { if (error instanceof AccessError) return NextResponse.json({ error: error.message }, { status: error.status }); console.error("[dashboard] request failed", error); return NextResponse.json({ error: "Unable to load dashboard." }, { status: 500 }); }

type Scope = { userId: string; familyId: string | null; accountId: string | null; currency: Currency; start: string; end: string; flowStart: string };

/** Totals from SQL, or null while the dashboard_totals migration is missing. */
async function loadTotals(scope: Scope): Promise<Totals | null> {
  const { data, error } = await getSupabaseServerClient().rpc("dashboard_totals", { p_user_id: scope.userId, p_family_group_id: scope.familyId, p_account_id: scope.accountId, p_currency: scope.currency, p_month_start: scope.start, p_month_end: scope.end, p_flow_start: scope.flowStart });
  if (isMissingFunction(error)) return null;
  if (error) throw error;
  return data as Totals;
}

async function loadRecent(scope: Scope) {
  let query = getSupabaseServerClient().from("transactions").select("id, title, type, amount, transaction_date, account_id, account:accounts!inner(id, name, currency), category:categories(name)").eq("account.currency", scope.currency).gte("transaction_date", scope.start).lte("transaction_date", scope.end);
  query = scope.familyId ? query.eq("family_group_id", scope.familyId) : query.eq("user_id", scope.userId).is("family_group_id", null);
  if (scope.accountId) query = query.eq("account_id", scope.accountId);
  const { data, error } = await query.order("transaction_date", { ascending: false }).order("created_at", { ascending: false }).order("id").limit(5);
  if (error) throw error;
  return (data ?? []) as unknown[];
}

export async function GET(request: Request) {
  try {
    const timing = createServerTiming();
    const user = await timing.measure("auth", requireAppUser);
    await timing.measure("recurring", () => materializeDueRecurringSafely(user));
    const params = new URL(request.url).searchParams;
    const requestedMonth = params.get("month") ?? new Date().toISOString().slice(0, 7);
    const month = monthPattern.test(requestedMonth) ? requestedMonth : new Date().toISOString().slice(0, 7);
    const scope = params.get("scope") ?? "personal";
    const requestedCurrency = params.get("currency") as Currency | null;
    const currency: Currency = requestedCurrency && currencies.includes(requestedCurrency) ? requestedCurrency : "TRY";
    const requestedAccountId = params.get("account") ?? "all";
    const familyId = scope.startsWith("family:") ? scope.slice(7) : null;
    const { start, end } = monthRange(month);
    const flowMonths = previousMonths(month);
    const flowStart = `${flowMonths[0]}-01`;
    const supabase = getSupabaseServerClient();

    const base = Promise.all([
      supabase.from("accounts").select("id, name, currency, initial_balance").eq("user_id", user.id).is("archived_at", null).order("name"),
      supabase.from("family_members").select("family_group_id, group:family_groups(id, name)").eq("user_id", user.id).eq("invitation_status", "accepted"),
      supabase.from("goals").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("family_group_id", null),
    ]);
    // The default view (personal, all accounts) needs nothing from the base
    // queries to compute totals, so all of them run in one round trip.
    const personalAll = !familyId && requestedAccountId === "all";
    const early = personalAll
      ? Promise.all([loadTotals({ userId: user.id, familyId: null, accountId: null, currency, start, end, flowStart }), loadRecent({ userId: user.id, familyId: null, accountId: null, currency, start, end, flowStart })])
      : null;
    const [[accountsResult, membershipsResult, goalsResult], earlyResult] = await timing.measure("queries", () => Promise.all([base, early]));
    if (accountsResult.error || membershipsResult.error || goalsResult.error) throw accountsResult.error ?? membershipsResult.error ?? goalsResult.error;
    const ownAccounts = (accountsResult.data ?? []) as Account[];
    const familyGroups = (membershipsResult.data ?? []).map((membership) => relation(membership.group)).filter((group): group is { id: string; name: string } => Boolean(group));
    if (familyId && !familyGroups.some((group) => group.id === familyId)) throw new AccessError("Family group not found.", 404);

    const familyAccounts = familyId ? await supabase.rpc("dashboard_family_accounts", { p_family_group_id: familyId }) : null;
    if (familyAccounts?.error && !isMissingFunction(familyAccounts.error)) throw familyAccounts.error;
    const useRows = isMissingFunction(familyAccounts?.error);
    const allTransactions = useRows ? await loadAllTransactions() : null;
    async function loadAllTransactions() {
      const result = await fetchAllRows<Transaction>(() => {
        const query = supabase.from("transactions").select("id, title, type, amount, transaction_date, account_id, account:accounts(id, name, currency), category:categories(name)");
        return (familyId ? query.eq("family_group_id", familyId) : query.eq("user_id", user.id).is("family_group_id", null)).order("transaction_date", { ascending: false }).order("created_at", { ascending: false });
      });
      if (result.error) throw result.error;
      return result.data;
    }
    const rowAccounts = allTransactions ? [...new Map(allTransactions.map((item) => relation(item.account)).filter((account): account is AccountOption => Boolean(account)).map((account) => [account.id, account])).values()] : [];
    const availableAccounts: AccountOption[] = familyId
      ? (allTransactions ? rowAccounts : (familyAccounts?.data ?? []) as AccountOption[])
      : ownAccounts.map(({ id, name, currency: accountCurrency }) => ({ id, name, currency: accountCurrency }));
    const selectedAccount = requestedAccountId === "all" ? null : availableAccounts.find((account) => account.id === requestedAccountId);
    const effectiveCurrency = selectedAccount?.currency ?? currency;
    const openingBalance = familyId ? 0 : ownAccounts.filter((account) => account.currency === effectiveCurrency && (!selectedAccount || account.id === selectedAccount.id)).reduce((sum, account) => sum + Number(account.initial_balance), 0);

    const resolved: Scope = { userId: user.id, familyId, accountId: selectedAccount?.id ?? null, currency: effectiveCurrency, start, end, flowStart };
    let [totals, recent] = earlyResult ?? (allTransactions ? [null, []] : await timing.measure("totals", () => Promise.all([loadTotals(resolved), loadRecent(resolved)])));
    if (!totals) {
      // The migration may reach production after this code: keep the row-based result until then.
      const rows = (allTransactions ?? await loadAllTransactions()).filter((item) => relation(item.account)?.currency === effectiveCurrency && (!selectedAccount || item.account_id === selectedAccount.id));
      totals = totalsFromRows(rows, start, end);
      recent = rows.filter((item) => item.transaction_date >= start && item.transaction_date <= end).slice(0, 5);
    }
    const income = Number(totals.income);
    const expenses = Number(totals.expenses);
    const balance = openingBalance + Number(totals.balance);
    const flowByMonth = new Map(totals.cashFlow.map((entry) => [entry.month, entry]));
    const cashFlow = flowMonths.map((value) => ({ month: value, income: Number(flowByMonth.get(value)?.income ?? 0), expense: Number(flowByMonth.get(value)?.expense ?? 0) }));
    const categories = totals.categories.map(({ name, value }) => ({ name, value: Number(value) })).sort((a, b) => b.value - a.value);
    return NextResponse.json({ hasGoals: (goalsResult.count ?? 0) > 0, filters: { month, scope: familyId ? scope : "personal", accountId: selectedAccount?.id ?? "all", currency: effectiveCurrency, accounts: availableAccounts, familyGroups, currencies }, summary: { balance, income, expenses, savingsRate: calculateSavingsRate(income, expenses) }, categories, recent, cashFlow }, { headers: { "Server-Timing": timing.header() } });
  } catch (error) { return errorResponse(error); }
}

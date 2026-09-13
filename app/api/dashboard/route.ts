import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/auth/authorization";
import { calculateSavingsRate } from "@/lib/finance/calculations";
import { listTransactionData } from "@/lib/finance/transaction-data";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const user = await requireAppUser();
    const [{ transactions }, accountsResult, budgetsResult] = await Promise.all([
      listTransactionData(user),
      getSupabaseServerClient().from("accounts").select("id, initial_balance").eq("user_id", user.id).eq("archived_at", null),
      getSupabaseServerClient().from("budgets").select("id, amount_limit, category_id, start_date, end_date").eq("user_id", user.id).is("family_group_id", null),
    ]);
    if (accountsResult.error || budgetsResult.error) throw accountsResult.error ?? budgetsResult.error;
    const month = new Date().toISOString().slice(0, 7);
    const income = transactions.filter((item) => item.type === "income" && item.transaction_date.startsWith(month)).reduce((total, item) => total + Number(item.amount), 0);
    const expenses = transactions.filter((item) => item.type === "expense" && item.transaction_date.startsWith(month)).reduce((total, item) => total + Number(item.amount), 0);
    const balance = (accountsResult.data ?? []).reduce((total, account) => total + Number(account.initial_balance), 0) + transactions.reduce((total, item) => total + (item.type === "income" ? Number(item.amount) : -Number(item.amount)), 0);
    const categoryTotals = new Map<string, number>();
    for (const item of transactions.filter((transaction) => transaction.type === "expense" && transaction.transaction_date.startsWith(month))) { const category = Array.isArray(item.category) ? item.category[0] : item.category; const name = category?.name ?? "Uncategorized"; categoryTotals.set(name, (categoryTotals.get(name) ?? 0) + Number(item.amount)); }
    return NextResponse.json({ summary:{balance,income,expenses,savingsRate:calculateSavingsRate(income,expenses)}, recent:transactions.slice(0,5), categories:[...categoryTotals].map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value), budgets:budgetsResult.data ?? [] });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load dashboard." }, { status: 500 }); }
}

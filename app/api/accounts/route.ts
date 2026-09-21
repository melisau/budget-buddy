import { NextResponse } from "next/server";
import { AccessError, requireAppUser } from "@/lib/auth/authorization";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Currency } from "@/types/finance";

const accountTypes = ["cash", "checking", "savings", "credit_card", "digital_wallet"] as const;
const currencies: Currency[] = ["TRY", "EUR", "USD", "GBP"];

function parseAccount(body: Record<string, unknown>) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const type = typeof body.type === "string" && accountTypes.includes(body.type as typeof accountTypes[number]) ? body.type : "";
  const currency = typeof body.currency === "string" && currencies.includes(body.currency as Currency) ? body.currency as Currency : null;
  const initialBalance = Number(body.initialBalance);
  return name.length >= 2 && name.length <= 80 && type && currency && Number.isFinite(initialBalance) ? { name, type, currency, initialBalance } : null;
}
function errorResponse(error: unknown) { if (error instanceof AccessError) return NextResponse.json({ error: error.message }, { status: error.status }); console.error("[accounts] request failed", error); return NextResponse.json({ error: "Unable to process the account request." }, { status: 500 }); }

export async function GET(request: Request) {
  try {
    const user = await requireAppUser();
    const includeArchived = new URL(request.url).searchParams.get("archived") === "true";
    const supabase = getSupabaseServerClient();
    let accountQuery = supabase.from("accounts").select("id, name, type, currency, initial_balance, archived_at, created_at").eq("user_id", user.id).order("created_at");
    if (!includeArchived) accountQuery = accountQuery.is("archived_at", null);
    const [accountsResult, transactionsResult] = await Promise.all([
      accountQuery,
      supabase.from("transactions").select("account_id, type, amount").eq("user_id", user.id),
    ]);
    if (accountsResult.error || transactionsResult.error) throw accountsResult.error ?? transactionsResult.error;
    const accounts = (accountsResult.data ?? []).map((account) => ({
      id: account.id, name: account.name, type: account.type, currency: account.currency as Currency,
      initialBalance: Number(account.initial_balance), archivedAt: account.archived_at,
      balance: Number(account.initial_balance) + (transactionsResult.data ?? []).filter((item) => item.account_id === account.id).reduce((sum, item) => sum + (item.type === "income" ? Number(item.amount) : -Number(item.amount)), 0),
    }));
    return NextResponse.json({ accounts });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const user = await requireAppUser();
    const payload = parseAccount(await request.json() as Record<string, unknown>);
    if (!payload) return NextResponse.json({ error: "Check the account fields." }, { status: 400 });
    const { data, error } = await getSupabaseServerClient().from("accounts").insert({ user_id: user.id, name: payload.name, type: payload.type, currency: payload.currency, initial_balance: payload.initialBalance }).select("id").single();
    if (error) throw error;
    return NextResponse.json({ account: data }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}

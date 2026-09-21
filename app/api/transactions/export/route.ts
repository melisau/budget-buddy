import { NextResponse } from "next/server";
import { AccessError, requireAppUser } from "@/lib/auth/authorization";
import { listTransactionData } from "@/lib/finance/transaction-data";

const quote = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
const joinedName = (value: unknown) => {
  const item = Array.isArray(value) ? value[0] : value;
  return item && typeof item === "object" && "name" in item ? String((item as { name?: unknown }).name ?? "") : "";
};

export async function GET(request: Request) {
  try {
    const user = await requireAppUser();
    const requestedScope = new URL(request.url).searchParams.get("scope");
    const scope = requestedScope === "family" || requestedScope === "all" ? requestedScope : "personal";
    const data = await listTransactionData(user);
    const rows = data.transactions.filter((transaction) => scope === "all" || (scope === "family" ? Boolean(transaction.family_group_id) : !transaction.family_group_id));
    const csv = ["date,description,amount,type,category,account,scope", ...rows.map((transaction) => [transaction.transaction_date, transaction.title, transaction.amount, transaction.type, joinedName(transaction.category), joinedName(transaction.account), transaction.family_group_id ? "family" : "personal"].map(quote).join(","))].join("\r\n");
    return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="budgetbuddy-${scope}-transactions.csv"`, "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof AccessError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[csv export] request failed", error);
    return NextResponse.json({ error: "Unable to export transactions." }, { status: 500 });
  }
}

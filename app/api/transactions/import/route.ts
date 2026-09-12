import { NextResponse } from "next/server";
import { AccessError, requireAppUser } from "@/lib/auth/authorization";
import { importPersonalCsvTransactions } from "@/lib/finance/csv-transaction-import";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { rows?: unknown };
    if (!Array.isArray(body.rows)) throw new AccessError("CSV rows are required.", 404);
    const rows = body.rows.filter((row): row is { title: string; category: string; accountName: string; transactionDate: string; amount: number; type: "income" | "expense" } => Boolean(row) && typeof row === "object" && typeof (row as { title?: unknown }).title === "string" && typeof (row as { category?: unknown }).category === "string" && typeof (row as { accountName?: unknown }).accountName === "string" && typeof (row as { transactionDate?: unknown }).transactionDate === "string" && typeof (row as { amount?: unknown }).amount === "number" && ((row as { type?: unknown }).type === "income" || (row as { type?: unknown }).type === "expense"));
    if (rows.length !== body.rows.length) throw new AccessError("CSV contains invalid rows.", 404);
    return NextResponse.json(await importPersonalCsvTransactions(await requireAppUser(), rows));
  } catch (error) {
    if (error instanceof AccessError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[csv import] request failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to import CSV." }, { status: 500 });
  }
}

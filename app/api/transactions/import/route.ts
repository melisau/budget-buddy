import { NextResponse } from "next/server";
import { AccessError, requireAppUser } from "@/lib/auth/authorization";
import { importPersonalCsvTransactions } from "@/lib/finance/csv-transaction-import";
import { parseTransactionCsv } from "@/lib/finance/csv-import";

type ImportRow = { title: string; category: string; accountName: string; transactionDate: string; amount: number; type: "income" | "expense" };

const MAX_CSV_BYTES = 2 * 1024 * 1024;

function isImportRow(row: unknown): row is ImportRow {
  if (!row || typeof row !== "object") return false;
  const value = row as Record<string, unknown>;
  return typeof value.title === "string" && typeof value.category === "string" && typeof value.accountName === "string"
    && typeof value.transactionDate === "string" && typeof value.amount === "number" && (value.type === "income" || value.type === "expense");
}

/**
 * Imports transactions from a CSV.
 * - Web: `{ rows }`, already parsed in the browser.
 * - Mobile: `{ csv }` raw text, parsed here with the same parser; `{ csv, preview: true }`
 *   only reports what would be imported and the rows that cannot be read.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json() as { rows?: unknown; csv?: unknown; preview?: unknown };
    let rows: ImportRow[];
    if (typeof body.csv === "string") {
      if (body.csv.length > MAX_CSV_BYTES) return NextResponse.json({ error: "The CSV file is too large (2 MB at most)." }, { status: 413 });
      const user = await requireAppUser();
      const parsed = parseTransactionCsv(body.csv);
      if (body.preview === true) {
        return NextResponse.json({ count: parsed.transactions.length, issues: parsed.issues.slice(0, 20), issueCount: parsed.issues.length });
      }
      if (!parsed.transactions.length) return NextResponse.json({ error: "No transactions could be read from the CSV." }, { status: 400 });
      rows = parsed.transactions.map(({ title, category, accountName, transactionDate, amount, type }) => ({ title, category, accountName, transactionDate, amount, type: type as ImportRow["type"] }));
      return NextResponse.json(await importPersonalCsvTransactions(user, rows));
    }
    if (!Array.isArray(body.rows)) throw new AccessError("CSV rows are required.", 404);
    rows = body.rows.filter(isImportRow);
    if (rows.length !== body.rows.length) throw new AccessError("CSV contains invalid rows.", 404);
    return NextResponse.json(await importPersonalCsvTransactions(await requireAppUser(), rows));
  } catch (error) {
    if (error instanceof AccessError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[csv import] request failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to import CSV." }, { status: 500 });
  }
}

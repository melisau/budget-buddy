import { NextResponse } from "next/server";
import { AccessError, requireAppUser } from "@/lib/auth/authorization";
import { createTransaction, listTransactionData, listTransactionPage } from "@/lib/finance/transaction-data";
import { readPageQuery } from "@/lib/finance/transaction-page";
import { materializeDueRecurringSafely } from "@/lib/finance/recurring-service";
import { transactionRequestSchema } from "@/validations/transaction";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { readIdempotencyKey } from "@/lib/finance/idempotency";

type JoinedRecord = { id: string; name: string } | { id: string; name: string }[] | null;

function joinedRecord(value: JoinedRecord) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function toClientTransaction(transaction: Record<string, unknown>) {
  const account = joinedRecord(transaction.account as JoinedRecord);
  const category = joinedRecord(transaction.category as JoinedRecord);
  const amount = Number(transaction.amount);

  return {
    id: String(transaction.id),
    title: String(transaction.title),
    category: category?.name ?? "Uncategorized",
    categoryId: category?.id ?? "",
    accountName: account?.name ?? "No account",
    accountId: account?.id ?? "",
    transactionDate: String(transaction.transaction_date),
    amount,
    type: transaction.type === "income" ? "income" : "expense",
    note: typeof transaction.note === "string" ? transaction.note : null,
    familyGroupId: typeof transaction.family_group_id === "string" ? transaction.family_group_id : null,
    ownerUserId: typeof transaction.owner_user_id === "string" ? transaction.owner_user_id : null,
    createdByUserId: typeof transaction.created_by_user_id === "string" ? transaction.created_by_user_id : null,
    hasReceipt: typeof transaction.receipt_path === "string" && transaction.receipt_path.length > 0,
  };
}

function errorResponse(error: unknown) {
  if (error instanceof AccessError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("[transactions] request failed", error);
  return NextResponse.json({ error: "Unable to process the transaction request." }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    const user = await requireAppUser();
    // Without `limit` the full list is returned, as older app versions expect.
    const page = readPageQuery(new URL(request.url).searchParams);
    if (page === "invalid") return NextResponse.json({ error: "Invalid page request." }, { status: 400 });
    if (!page?.cursor) await materializeDueRecurringSafely(user);
    if (page) {
      const result = await listTransactionPage(user, page);
      return NextResponse.json({
        transactions: result.transactions.map((transaction) => toClientTransaction(transaction as Record<string, unknown>)),
        nextCursor: result.nextCursor,
        accounts: result.accounts,
        categories: result.categories,
      });
    }
    const data = await listTransactionData(user);
    return NextResponse.json({
      transactions: data.transactions.map((transaction) => toClientTransaction(transaction as Record<string, unknown>)),
      accounts: data.accounts,
      categories: data.categories,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAppUser();
    const limit = await checkRateLimit(`transactions:${user.id}`, 30, 60_000);
    if (!limit.allowed) return NextResponse.json({ error: "Too many transaction requests. Please try again shortly." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
    const requestId = readIdempotencyKey(request.headers);
    if (requestId === "invalid") return NextResponse.json({ error: "Idempotency-Key must be a UUID." }, { status: 400 });
    const payload = transactionRequestSchema.parse(await request.json());
    const { transaction, replayed } = await createTransaction(user, {
      type: payload.type,
      amount: payload.amount,
      title: payload.title,
      categoryId: payload.category,
      accountId: payload.account,
      date: payload.date,
      note: payload.note,
      familyGroupId: payload.familyGroupId,
    }, requestId ?? undefined);

    return NextResponse.json({ transaction: toClientTransaction(transaction as Record<string, unknown>) }, { status: replayed ? 200 : 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Please check the transaction fields." }, { status: 400 });
    }
    return errorResponse(error);
  }
}

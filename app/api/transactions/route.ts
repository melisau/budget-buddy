import { NextResponse } from "next/server";
import { AccessError, requireAppUser } from "@/lib/auth/authorization";
import { createTransaction, listTransactionData } from "@/lib/finance/transaction-data";
import { transactionRequestSchema } from "@/validations/transaction";

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
    accountName: account?.name ?? "Unknown account",
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

export async function GET() {
  try {
    const user = await requireAppUser();
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
    const payload = transactionRequestSchema.parse(await request.json());
    const transaction = await createTransaction(user, {
      type: payload.type,
      amount: payload.amount,
      title: payload.title,
      categoryId: payload.category,
      accountId: payload.account,
      date: payload.date,
      note: payload.note,
      familyGroupId: payload.familyGroupId,
      ownerUserId: payload.ownerUserId,
    });

    return NextResponse.json({ transaction: toClientTransaction(transaction as Record<string, unknown>) }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Please check the transaction fields." }, { status: 400 });
    }
    return errorResponse(error);
  }
}

import { NextResponse } from "next/server";
import { AccessError, requireAppUser, requireTransactionWriteAccess } from "@/lib/auth/authorization";
import { deleteTransaction, updateTransaction } from "@/lib/finance/transaction-data";
import { deleteStoredReceipt } from "@/lib/finance/receipt-storage";
import { transactionRequestSchema } from "@/validations/transaction";

type RouteContext = { params: Promise<{ transactionId: string }> };

function errorResponse(error: unknown) {
  if (error instanceof AccessError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("[transactions] mutation failed", error);
  return NextResponse.json({ error: "Unable to update the transaction." }, { status: 500 });
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireAppUser();
    const { transactionId } = await context.params;
    await requireTransactionWriteAccess(user.id, transactionId);
    const payload = transactionRequestSchema.parse(await request.json());
    await updateTransaction(user, transactionId, {
      type: payload.type,
      amount: payload.amount,
      title: payload.title,
      categoryId: payload.category,
      accountId: payload.account,
      date: payload.date,
      note: payload.note,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Please check the transaction fields." }, { status: 400 });
    }
    return errorResponse(error);
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  try {
    const user = await requireAppUser();
    const { transactionId } = await context.params;
    await requireTransactionWriteAccess(user.id, transactionId);
    const receiptPath = await deleteTransaction(transactionId);
    try { await deleteStoredReceipt(receiptPath); } catch (receiptError) { console.error("[transactions] receipt cleanup failed", receiptError); }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}

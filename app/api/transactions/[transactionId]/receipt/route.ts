import { NextResponse } from "next/server";
import { AccessError, requireAppUser, requireTransactionReadAccess, requireTransactionWriteAccess } from "@/lib/auth/authorization";
import { createReceiptUrl, deleteStoredReceipt } from "@/lib/finance/receipt-storage";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ transactionId: string }> };
function errorResponse(error: unknown) {
  if (error instanceof AccessError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error("[receipt] request failed", error);
  return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to process the receipt." }, { status: 500 });
}

async function lookupPath(transactionId: string) {
  const { data, error } = await getSupabaseServerClient().from("transactions").select("receipt_path, receipt_content_type").eq("id", transactionId).maybeSingle();
  if (error) throw new Error(`Unable to look up the receipt: ${error.message}`);
  if (!data?.receipt_path) throw new AccessError("Receipt not found.", 404);
  return data;
}

export async function GET(_: Request, context: RouteContext) {
  try {
    const user = await requireAppUser(); const { transactionId } = await context.params;
    await requireTransactionReadAccess(user.id, transactionId);
    const receipt = await lookupPath(transactionId);
    return NextResponse.json({ url: await createReceiptUrl(receipt.receipt_path), contentType: receipt.receipt_content_type }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return errorResponse(error); }
}

export async function POST(_: Request, context: RouteContext) {
  try {
    const user = await requireAppUser(); const { transactionId } = await context.params;
    await requireTransactionWriteAccess(user.id, transactionId);
    // New images are no longer stored. Existing ones can still be opened and removed.
    return NextResponse.json({ error: "Receipt image uploads are no longer available." }, { status: 410 });
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(_: Request, context: RouteContext) {
  try {
    const user = await requireAppUser(); const { transactionId } = await context.params;
    await requireTransactionWriteAccess(user.id, transactionId);
    const receipt = await lookupPath(transactionId);
    const { error } = await getSupabaseServerClient().from("transactions").update({ receipt_path: null, receipt_content_type: null }).eq("id", transactionId);
    if (error) throw new Error(`Unable to clear the receipt: ${error.message}`);
    try { await deleteStoredReceipt(receipt.receipt_path); } catch (storageError) { console.error("[receipt] cleanup failed", storageError); }
    return NextResponse.json({ ok: true });
  } catch (error) { return errorResponse(error); }
}

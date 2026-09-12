import { NextResponse } from "next/server";
import { AccessError, requireAppUser, requireTransactionReadAccess, requireTransactionWriteAccess } from "@/lib/auth/authorization";
import { createReceiptUrl, deleteStoredReceipt, uploadReceipt } from "@/lib/finance/receipt-storage";
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

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireAppUser(); const { transactionId } = await context.params;
    await requireTransactionWriteAccess(user.id, transactionId);
    const file = (await request.formData()).get("receipt");
    if (!(file instanceof File)) throw new AccessError("Choose a receipt image.", 404);
    const previous = await getSupabaseServerClient().from("transactions").select("receipt_path").eq("id", transactionId).maybeSingle();
    if (previous.error) throw new Error(`Unable to look up the existing receipt: ${previous.error.message}`);
    const uploaded = await uploadReceipt(transactionId, file);
    const { error } = await getSupabaseServerClient().from("transactions").update({ receipt_path: uploaded.path, receipt_content_type: uploaded.contentType }).eq("id", transactionId);
    if (error) { await deleteStoredReceipt(uploaded.path); throw new Error(`Unable to save the receipt: ${error.message}`); }
    await deleteStoredReceipt(previous.data?.receipt_path);
    return NextResponse.json({ ok: true }, { status: 201 });
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

import { NextResponse } from "next/server";
import { AccessError, requireAppUser } from "@/lib/auth/authorization";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { MAX_RECEIPT_BODY_BYTES, scannedReceiptSchema } from "@/validations/receipt";

const DAILY_LIMIT = 30;
const DAY_MS = 86_400_000;

export async function POST(request: Request) {
  try {
    const user = await requireAppUser();
    if (Number(request.headers.get("content-length") ?? 0) > MAX_RECEIPT_BODY_BYTES) {
      return NextResponse.json({ error: "Receipt data is too large." }, { status: 413 });
    }
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_RECEIPT_BODY_BYTES) {
      return NextResponse.json({ error: "Receipt data is too large." }, { status: 413 });
    }
    const limit = await checkRateLimit(`receipts:${user.id}`, DAILY_LIMIT, DAY_MS);
    if (!limit.allowed) {
      return NextResponse.json({ error: "Daily receipt limit reached." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
    }
    let json: unknown;
    try { json = JSON.parse(raw); } catch { return NextResponse.json({ error: "Please check the receipt fields." }, { status: 400 }); }
    const parsed = scannedReceiptSchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: "Please check the receipt fields." }, { status: 400 });

    const { title, category, account, receipt } = parsed.data;
    const { data, error } = await getSupabaseServerClient().rpc("save_scanned_receipt", {
      p_user_id: user.id,
      p_account_id: account,
      p_category_id: category,
      p_title: title,
      p_receipt: receipt,
    });
    if (error) {
      if (error.message.includes("receipt_reference_invalid")) {
        return NextResponse.json({ error: "The selected account or category is unavailable." }, { status: 400 });
      }
      throw error;
    }
    return NextResponse.json({ transactionId: data }, { status: 201 });
  } catch (error) {
    if (error instanceof AccessError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[receipts] request failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Unable to save the receipt." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { AccessError, requireAppUser } from "@/lib/auth/authorization";
import { isTrustedApiWrite } from "@/lib/auth/request-origin";
import { settleRecurring } from "@/lib/finance/recurring-service";
import { recurringSettleSchema } from "@/validations/recurring";

type Context = { params: Promise<{ recurringId: string }> };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Body `{ date, paid }`: records the payment due on `date` as paid, or skips it. */
export async function POST(request: Request, context: Context) {
  if (!isTrustedApiWrite(request)) return NextResponse.json({ error: "Same-origin request required." }, { status: 403 });
  try {
    const user = await requireAppUser();
    const { recurringId } = await context.params;
    if (!uuid.test(recurringId)) throw new AccessError("Recurring item not found.", 404);
    const body = recurringSettleSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return NextResponse.json({ error: "Please check the fields." }, { status: 400 });
    // 409: already settled or the date moved on (for example a second click).
    if (!await settleRecurring(user, recurringId, body.data.date, body.data.paid)) {
      return NextResponse.json({ error: "This payment was already handled." }, { status: 409 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AccessError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[recurring settle] request failed", error);
    return NextResponse.json({ error: "Unable to update the payment." }, { status: 500 });
  }
}

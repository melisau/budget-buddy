import { NextResponse } from "next/server";
import { z } from "zod";
import { AccessError, requireAppUser } from "@/lib/auth/authorization";
import { isTrustedApiWrite } from "@/lib/auth/request-origin";
import { getTotalBudget, removeTotalBudget, setTotalBudget } from "@/lib/finance/total-budget";

const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const setSchema = z.object({ month, amountLimit: z.coerce.number().positive().max(1_000_000_000) });

function fail(error: unknown) {
  if (error instanceof AccessError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error("[total budget] request failed", error);
  return NextResponse.json({ error: "Unable to process the overall budget request." }, { status: 500 });
}

/** The overall spending limit for a month, with that month's spending and income. */
export async function GET(request: Request) {
  try {
    const user = await requireAppUser();
    const requested = month.safeParse(new URL(request.url).searchParams.get("month"));
    const current = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", timeZone: "Europe/Istanbul" }).format(new Date());
    return NextResponse.json(await getTotalBudget(user, requested.success ? requested.data : current));
  } catch (error) { return fail(error); }
}

/** Body `{ month, amountLimit }`: sets or changes the month's overall limit. */
export async function PUT(request: Request) {
  if (!isTrustedApiWrite(request)) return NextResponse.json({ error: "Same-origin request required." }, { status: 403 });
  try {
    const user = await requireAppUser();
    const body = setSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return NextResponse.json({ error: "Enter a monthly amount greater than zero." }, { status: 400 });
    await setTotalBudget(user, body.data.month, body.data.amountLimit);
    return NextResponse.json(await getTotalBudget(user, body.data.month));
  } catch (error) { return fail(error); }
}

/** Body `{ month }`: removes the month's overall limit. */
export async function DELETE(request: Request) {
  if (!isTrustedApiWrite(request)) return NextResponse.json({ error: "Same-origin request required." }, { status: 403 });
  try {
    const user = await requireAppUser();
    const body = z.object({ month }).safeParse(await request.json().catch(() => null));
    if (!body.success) return NextResponse.json({ error: "Choose a valid month." }, { status: 400 });
    await removeTotalBudget(user, body.data.month);
    return NextResponse.json({ ok: true });
  } catch (error) { return fail(error); }
}

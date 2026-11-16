import { NextResponse } from "next/server";
import { AccessError, requireAppUser } from "@/lib/auth/authorization";
import { createRecurring, listRecurring } from "@/lib/finance/recurring-service";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { toRecurringInput } from "@/validations/recurring";

function fail(error: unknown) {
  if (error instanceof AccessError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error("[recurring] request failed", error);
  return NextResponse.json({ error: "Unable to process the recurring item request." }, { status: 500 });
}

export async function GET() {
  try {
    const user = await requireAppUser();
    return NextResponse.json(await listRecurring(user));
  } catch (error) { return fail(error); }
}

export async function POST(request: Request) {
  try {
    const user = await requireAppUser();
    const limit = await checkRateLimit(`recurring:${user.id}`, 30, 60_000);
    if (!limit.allowed) return NextResponse.json({ error: "Too many requests. Please try again shortly." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
    const item = await createRecurring(user, toRecurringInput(await request.json()));
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") return NextResponse.json({ error: "Please check the fields." }, { status: 400 });
    return fail(error);
  }
}

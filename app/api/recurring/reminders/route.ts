import { NextResponse } from "next/server";
import { AccessError, requireAppUser } from "@/lib/auth/authorization";
import { listDueReminders } from "@/lib/finance/recurring-service";

/** Recurring payments whose reminder is open and still waiting for "paid" or "skipped". */
export async function GET() {
  try {
    const response = NextResponse.json({ reminders: await listDueReminders(await requireAppUser()) });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) {
    if (error instanceof AccessError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[recurring reminders] request failed", error);
    return NextResponse.json({ error: "Unable to load payment reminders." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { AccessError, requireAppUser } from "@/lib/auth/authorization";
import { sameOriginFormOrigin } from "@/lib/auth/request-origin";
import { loadNotifications, markNotificationsRead, setEmailNotifications } from "@/lib/notifications/service";
import { isMissingSchemaError } from "@/lib/supabase/schema-errors";

function failure(error: unknown) {
  if (error instanceof AccessError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error("[notifications] request failed", error instanceof Error ? error.message : error);
  return NextResponse.json({ error: "Unable to process the notification request." }, { status: 500 });
}

export async function GET() {
  try {
    const user = await requireAppUser();
    const response = NextResponse.json(await loadNotifications({ id: user.id, email: user.email }));
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) {
    return failure(error);
  }
}

/** Marks notifications as read: the listed ids, or every unread one when no ids are sent. */
export async function POST(request: Request) {
  if (!sameOriginFormOrigin(request)) return NextResponse.json({ error: "Same-origin request required." }, { status: 403 });
  try {
    const user = await requireAppUser();
    const body = await request.json().catch(() => ({})) as { ids?: unknown };
    const ids = Array.isArray(body.ids) ? body.ids.filter((id): id is string => typeof id === "string").slice(0, 100) : undefined;
    if (ids && ids.length === 0) return NextResponse.json({ ok: true });
    await markNotificationsRead(user.id, ids);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isMissingSchemaError(error)) return NextResponse.json({ ok: true });
    return failure(error);
  }
}

/** Turns the e-mail copy of notifications on or off. */
export async function PATCH(request: Request) {
  if (!sameOriginFormOrigin(request)) return NextResponse.json({ error: "Same-origin request required." }, { status: 403 });
  try {
    const user = await requireAppUser();
    const body = await request.json().catch(() => ({})) as { emailEnabled?: unknown };
    if (typeof body.emailEnabled !== "boolean") return NextResponse.json({ error: "Choose on or off." }, { status: 400 });
    await setEmailNotifications(user.id, body.emailEnabled);
    return NextResponse.json({ emailEnabled: body.emailEnabled });
  } catch (error) {
    return failure(error);
  }
}

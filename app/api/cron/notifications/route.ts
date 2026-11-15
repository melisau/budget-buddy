import { NextResponse } from "next/server";
import { runNotificationJob } from "@/lib/notifications/service";
import { hasValidBearerSecret } from "@/lib/security/secret";

// Called once a day by the server's cron (see docs/vds.md), never by browsers.
// It has no user session; the shared secret is its only credential.
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) {
    return NextResponse.json({ error: "The notification job is not configured." }, { status: 503 });
  }
  if (!hasValidBearerSecret(request, secret)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    const response = NextResponse.json(await runNotificationJob());
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) {
    console.error("[notifications] job failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "The notification job failed." }, { status: 500 });
  }
}

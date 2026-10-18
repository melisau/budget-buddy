import { NextResponse } from "next/server";
import { getClerkAuth } from "@/lib/auth/clerk-server";
import { requireAppUser } from "@/lib/auth/authorization";
import { captureException } from "@/lib/monitoring/sentry";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type ErrorReport = { source?: unknown; message?: unknown; stack?: unknown; path?: unknown };

const trim = (value: unknown, limit: number) => typeof value === "string" ? value.slice(0, limit) : null;

function clientAddress(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")?.trim()
    || "unknown";
}

/**
 * Receives browser errors. Signed-in reports are stored in `error_events` and
 * forwarded to Sentry; signed-out reports (landing and sign-in pages) go only
 * to Sentry, limited per IP. Always answers 204 so reporting never breaks the UI.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json() as ErrorReport;
    const message = trim(body.message, 500);
    if (!message) return NextResponse.json({ error: "An error message is required." }, { status: 400 });
    const source = body.source === "boundary" ? "boundary" : "client";
    const stack = trim(body.stack, 4_000);
    const path = trim(body.path, 500);

    const auth = await getClerkAuth();
    if (!auth.isAuthenticated) {
      const limit = await checkRateLimit(`error-report:anon:${clientAddress(request)}`, 10, 60_000);
      if (limit.allowed) {
        const error = new Error(message);
        error.stack = stack ?? undefined;
        await captureException(error, { source, path, tags: { signedIn: "false" } });
      }
      return new NextResponse(null, { status: 204 });
    }

    const user = await requireAppUser();
    const limit = await checkRateLimit(`error-report:${user.id}`, 20, 60_000);
    if (!limit.allowed) return new NextResponse(null, { status: 204 });

    const error = new Error(message);
    error.stack = stack ?? undefined;
    const [insert] = await Promise.all([
      getSupabaseServerClient().from("error_events").insert({ user_id: user.id, source, message, stack, path }),
      captureException(error, { source, path, userId: user.id, tags: { signedIn: "true" } }),
    ]);
    if (insert.error) throw insert.error;
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[error reporting] failed", error);
    return new NextResponse(null, { status: 204 });
  }
}

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-server";
import { requireAppUser } from "@/lib/auth/authorization";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type ErrorReport = { source?: unknown; message?: unknown; stack?: unknown; path?: unknown };

const trim = (value: unknown, limit: number) => typeof value === "string" ? value.slice(0, limit) : null;

export async function POST(request: Request) {
  try {
    if (!await getCurrentUser()) return new NextResponse(null, { status: 204 });
    const user = await requireAppUser();
    const limit = checkRateLimit(`error-report:${user.id}`, 20, 60_000);
    if (!limit.allowed) return new NextResponse(null, { status: 204 });

    const body = await request.json() as ErrorReport;
    const message = trim(body.message, 500);
    const source = body.source === "boundary" ? "boundary" : "client";
    if (!message) return NextResponse.json({ error: "An error message is required." }, { status: 400 });

    const { error } = await getSupabaseServerClient().from("error_events").insert({
      user_id: user.id,
      source,
      message,
      stack: trim(body.stack, 4_000),
      path: trim(body.path, 500),
    });
    if (error) throw error;
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[error reporting] failed", error);
    return new NextResponse(null, { status: 204 });
  }
}

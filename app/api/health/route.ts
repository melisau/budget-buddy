import { NextResponse } from "next/server";
import { captureException } from "@/lib/monitoring/sentry";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Public health check used by the daily keep-alive workflow and uptime
 * monitoring. It runs one tiny database query, which also counts as activity
 * so a free Supabase project is not paused for inactivity. It reveals nothing
 * beyond whether the app and database respond.
 */
export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  try {
    const { error } = await getSupabaseServerClient().from("users").select("id").limit(1);
    if (error) throw error;
    return NextResponse.json({ ok: true, database: "up" }, { headers });
  } catch (error) {
    await captureException(error, { source: "server", path: "/api/health", level: "warning" });
    return NextResponse.json({ ok: false, database: "down" }, { status: 503, headers });
  }
}

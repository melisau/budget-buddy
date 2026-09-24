import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAuthClient } from "@/lib/supabase/auth-server";

// Token-hash email links also work when opened in a different browser.
export async function GET(request: NextRequest) {
  const token_hash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  if (token_hash && (type === "email" || type === "recovery" || type === "email_change")) {
    const client = await createSupabaseAuthClient();
    const { error } = await client.auth.verifyOtp({ token_hash, type });
    if (!error) {
      const response = NextResponse.redirect(new URL(type === "recovery" ? "/update-password" : "/dashboard", request.url));
      response.headers.set("Cache-Control", "private, no-store");
      response.headers.set("Referrer-Policy", "no-referrer");
      return response;
    }
  }
  return NextResponse.redirect(new URL("/sign-in?error=confirmation", request.url));
}

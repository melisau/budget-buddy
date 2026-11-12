import { NextResponse, type NextRequest } from "next/server";
import { publicUrl } from "@/lib/auth/request-origin";
import { createSupabaseAuthClient } from "@/lib/supabase/auth-server";
import { authDestination } from "@/lib/auth/redirect";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const client = await createSupabaseAuthClient();
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error) {
      const response = NextResponse.redirect(publicUrl(authDestination(request.nextUrl.searchParams.get("next")), request));
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }
  }
  return NextResponse.redirect(publicUrl("/sign-in?error=callback", request));
}

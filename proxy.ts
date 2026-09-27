import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

export async function proxy(request: NextRequest) {
  const { url, key } = getSupabasePublicConfig();
  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values, headers) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        const previous = response.cookies.getAll();
        response = NextResponse.next({ request });
        previous.forEach((cookie) => response.cookies.set(cookie));
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
      },
    },
  });
  await supabase.auth.getUser();
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Vary", "Cookie");
  return response;
}

// Authorization is also checked beside every protected resource.
export const config = {
  matcher: ["/sign-in", "/sign-up", "/auth/:path*", "/forgot-password", "/update-password", "/dashboard/:path*", "/accounts/:path*", "/analytics/:path*", "/assistant/:path*", "/budgets/:path*", "/family/:path*", "/goals/:path*", "/settings/:path*", "/transactions/:path*", "/api/:path*"],
};

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { readSupabasePublicConfig } from "@/lib/supabase/config";

// Refreshes the Supabase session cookie on every matched request so server
// code always sees a valid session. Authorization itself is checked next to
// every protected resource with auth.getUser(); nothing here grants access.
export async function proxy(request: NextRequest) {
  const config = readSupabasePublicConfig();
  if (!config) {
    // Missing configuration must not take the whole site down (a missing
    // publishable key caused the earlier 500s). Protected code still denies
    // access because no user can be verified.
    console.error("[auth] Supabase Auth is not configured; sessions cannot be refreshed.");
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(config.url, config.key, {
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

  try {
    await supabase.auth.getUser();
  } catch (error) {
    console.error("[auth] session refresh failed", error instanceof Error ? error.message : error);
  }
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Vary", "Cookie");
  return response;
}

export const config = {
  matcher: [
    "/sign-in", "/sign-up", "/auth/:path*", "/forgot-password", "/update-password",
    "/dashboard/:path*", "/accounts/:path*", "/analytics/:path*", "/assistant/:path*",
    "/budgets/:path*", "/family/:path*", "/goals/:path*", "/settings/:path*",
    "/transactions/:path*", "/wishlists/:path*", "/api/:path*",
  ],
};

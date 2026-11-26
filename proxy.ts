import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { parseBearerCredential } from "@/lib/auth/bearer";
import { readSupabasePublicConfig } from "@/lib/supabase/config";
import { LANDING_LANGUAGE_BY_PATH, LANDING_LANGUAGE_COOKIE, PAGE_LANGUAGE_HEADER, preferredLandingPath } from "@/lib/seo/i18n";

// Refreshes the Supabase session cookie on every matched request so server
// code always sees a valid session. Authorization itself is checked next to
// every protected resource; nothing here grants access.
export async function proxy(request: NextRequest) {
  // Public landing pages: no session work, only tell the root layout which
  // language the page is in so the server HTML carries the right <html lang>.
  const landingLanguage = LANDING_LANGUAGE_BY_PATH[request.nextUrl.pathname];
  // First visit to "/": send German and other non-Turkish browsers to their
  // landing page. Search engine bots and anyone who already picked a language
  // stay on the Turkish page, so "/" keeps being indexed as Turkish.
  if (request.nextUrl.pathname === "/" && !request.cookies.has(LANDING_LANGUAGE_COOKIE) && !/bot|crawl|spider|slurp|facebookexternalhit|preview/i.test(request.headers.get("user-agent") ?? "")) {
    const target = preferredLandingPath(request.headers.get("accept-language"));
    if (target) {
      const url = request.nextUrl.clone();
      url.pathname = target;
      const redirect = NextResponse.redirect(url, 307);
      redirect.headers.set("Vary", "Accept-Language, Cookie");
      return redirect;
    }
  }
  if (landingLanguage) {
    const headers = new Headers(request.headers);
    headers.set(PAGE_LANGUAGE_HEADER, landingLanguage);
    return NextResponse.next({ request: { headers } });
  }

  // Mobile API calls carry their own token: no cookie session to refresh or set.
  if (request.nextUrl.pathname.startsWith("/api/") && parseBearerCredential(request.headers.get("authorization")).kind !== "none") {
    const response = NextResponse.next({ request });
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Vary", "Authorization");
    return response;
  }

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
    // Refreshes an expired session cookie; the signature check is local, so a
    // valid cookie costs no Auth server round trip. Routes still verify access.
    await supabase.auth.getClaims();
  } catch (error) {
    console.error("[auth] session refresh failed", error instanceof Error ? error.message : error);
  }
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Vary", "Cookie, Authorization");
  return response;
}

export const config = {
  matcher: [
    "/", "/en", "/de",
    "/sign-in", "/sign-up", "/auth/:path*", "/forgot-password", "/update-password",
    "/dashboard/:path*", "/accounts/:path*", "/analytics/:path*", "/assistant/:path*",
    "/budgets/:path*", "/family/:path*", "/goals/:path*", "/recurring/:path*", "/settings/:path*",
    "/transactions/:path*", "/wishlists/:path*", "/api/:path*",
  ],
};

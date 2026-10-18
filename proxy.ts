import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { AUTH_IDENTITY_HEADER, signAuthIdentity } from "@/lib/auth/auth-header-signature";

// Headers that only the proxy may set. Any client-supplied copy is discarded.
const LEGACY_IDENTITY_HEADERS = ["x-clerk-auth-status", "x-budget-buddy-user-id"];

// Authentication and authorization are enforced next to each protected
// resource. The proxy attaches Clerk's request context to every application
// route without relying on a second, path-based access-control list.
export default clerkMiddleware(
  async (auth, request) => {
    const authState = await auth();
    const requestHeaders = new Headers(request.headers);

    requestHeaders.delete(AUTH_IDENTITY_HEADER);
    for (const name of LEGACY_IDENTITY_HEADERS) requestHeaders.delete(name);

    if (authState.isAuthenticated && authState.userId) {
      requestHeaders.set(AUTH_IDENTITY_HEADER, await signAuthIdentity(authState.userId));
    }

    return NextResponse.next({ request: { headers: requestHeaders } });
  },
  {
    frontendApiProxy: { enabled: true },
  },
);

export const config = {
  matcher: [
    "/__clerk/(.*)",
    "/",
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/auth/complete(.*)",
    "/dashboard(.*)",
    "/accounts(.*)",
    "/analytics(.*)",
    "/assistant(.*)",
    "/budgets(.*)",
    "/family(.*)",
    "/goals(.*)",
    "/settings(.*)",
    "/transactions(.*)",
    "/(api|trpc)(.*)",
  ],
};

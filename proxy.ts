import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Authentication and authorization are enforced next to each protected
// resource. The proxy attaches Clerk's request context to every application
// route without relying on a second, path-based access-control list.
export default clerkMiddleware(async (auth, request) => {
  const authState = await auth();
  const requestHeaders = new Headers(request.headers);

  requestHeaders.set(
    "x-clerk-auth-status",
    authState.isAuthenticated ? "signed-in" : "signed-out",
  );

  if (authState.isAuthenticated && authState.userId) {
    requestHeaders.set("x-budget-buddy-user-id", authState.userId);
  } else {
    requestHeaders.delete("x-budget-buddy-user-id");
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
});

export const config = {
  matcher: [
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

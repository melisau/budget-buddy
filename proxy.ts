import { clerkMiddleware } from "@clerk/nextjs/server";

// Authentication and authorization are enforced next to each protected
// resource. The proxy attaches Clerk's request context to every application
// route without relying on a second, path-based access-control list.
export default clerkMiddleware();

export const config = {
  matcher: [
    "/",
    "/sign-in(.*)",
    "/sign-up(.*)",
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

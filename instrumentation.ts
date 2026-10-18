import { captureException } from "@/lib/monitoring/sentry";

// Next.js calls this for every uncaught error in a route handler, server
// component or server action. Client-side errors arrive via /api/errors.
export async function onRequestError(
  error: unknown,
  request: { path: string; method: string },
  context: { routerKind: string; routePath: string; routeType: string },
) {
  await captureException(error, {
    source: "server",
    path: context.routePath || request.path,
    tags: { method: request.method, routeType: context.routeType, routerKind: context.routerKind },
  });
}

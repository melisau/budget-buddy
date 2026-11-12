import { SITE_URL } from "@/lib/site";

// A proxied request URL may use an internal host; Host identifies the browser-facing origin.
export function sameOriginFormOrigin(request: Request): string | null {
  const url = new URL(request.url);
  const host = request.headers.get("host") ?? url.host;
  const forwardedProtocol = request.headers.get("x-forwarded-proto");
  const protocol = forwardedProtocol === "http" || forwardedProtocol === "https"
    ? forwardedProtocol
    : url.protocol.slice(0, -1);
  let publicOrigin: string;
  try {
    publicOrigin = new URL(`${protocol}://${host}`).origin;
  } catch {
    return null;
  }
  const submittedOrigin = request.headers.get("origin");
  if (submittedOrigin === publicOrigin) return publicOrigin;
  if (submittedOrigin === null && request.headers.get("sec-fetch-site") === "same-origin") return publicOrigin;
  return null;
}

/**
 * Absolute URL for a redirect or link that the browser will follow.
 * In production the app runs behind a proxy (Caddy on the VDS), so request.url
 * holds the container's internal address (for example 0.0.0.0:3000). Use the
 * canonical site URL there; in development keep the request's own origin.
 */
export function publicUrl(path: string, request: Request, production = process.env.NODE_ENV === "production"): URL {
  return new URL(path, production ? SITE_URL : new URL(request.url).origin);
}

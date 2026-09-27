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

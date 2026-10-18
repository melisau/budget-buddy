/**
 * Signs the identity that `proxy.ts` forwards to route handlers.
 *
 * Request headers can be supplied by any client. A route that is accidentally
 * left out of the proxy matcher would otherwise accept a forged user ID. The
 * proxy therefore attaches an HMAC over the Clerk user ID and a timestamp, and
 * the server only trusts the identity when that signature verifies.
 *
 * Uses Web Crypto only, so it runs in both the proxy and Node route handlers.
 */

export const AUTH_IDENTITY_HEADER = "x-budget-buddy-identity";

/** A signed identity is only valid for the request that produced it. */
const MAX_AGE_MS = 60_000;
const encoder = new TextEncoder();
let keyPromise: Promise<CryptoKey> | undefined;
let keySource: string | undefined;

function signingSecret(): string {
  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) throw new Error("Clerk server configuration is unavailable.");
  return secret;
}

function signingKey(): Promise<CryptoKey> {
  const secret = signingSecret();
  if (!keyPromise || keySource !== secret) {
    keySource = secret;
    // Domain-separate the derived key from the raw Clerk secret.
    keyPromise = crypto.subtle.importKey(
      "raw",
      encoder.encode(`budget-buddy:auth-identity:v1:${secret}`),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"],
    );
  }
  return keyPromise;
}

function toBase64Url(bytes: ArrayBuffer): string {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> | null {
  try {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

// Clerk user IDs are `user_` followed by alphanumerics; reject anything else
// before it reaches a database query.
const USER_ID_PATTERN = /^[A-Za-z0-9_]{1,128}$/;

export async function signAuthIdentity(userId: string, now = Date.now()): Promise<string> {
  if (!USER_ID_PATTERN.test(userId)) throw new Error("Unexpected Clerk user ID format.");
  const payload = `${userId}.${now}`;
  const signature = await crypto.subtle.sign("HMAC", await signingKey(), encoder.encode(payload));
  return `${payload}.${toBase64Url(signature)}`;
}

/** Returns the user ID when the header is authentic and fresh, otherwise null. */
export async function verifyAuthIdentity(value: string | null | undefined, now = Date.now()): Promise<string | null> {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const [userId, issuedAtText, signatureText] = parts;
  if (!USER_ID_PATTERN.test(userId) || !/^\d{1,16}$/.test(issuedAtText)) return null;

  const issuedAt = Number(issuedAtText);
  if (!Number.isSafeInteger(issuedAt) || issuedAt > now + 5_000 || now - issuedAt > MAX_AGE_MS) return null;

  const signature = fromBase64Url(signatureText);
  if (!signature) return null;

  // crypto.subtle.verify performs a constant-time comparison.
  const valid = await crypto.subtle.verify(
    "HMAC",
    await signingKey(),
    signature,
    encoder.encode(`${userId}.${issuedAtText}`),
  );
  return valid ? userId : null;
}

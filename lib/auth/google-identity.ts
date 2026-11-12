/** Helpers for site-hosted Google sign-in (Google Identity Services + Supabase signInWithIdToken). */

export function googleIdentityClientId(value = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID): string | null {
  const id = value?.trim();
  return id && id.endsWith(".apps.googleusercontent.com") ? id : null;
}

/** Inside the Android TWA the Google popup can fail, so the redirect flow is used there. */
export function isTrustedWebActivity(referrer: string): boolean {
  return referrer.startsWith("android-app://");
}

/** Random nonce: the raw value goes to Supabase, its SHA-256 hex digest to Google. */
export async function createNoncePair(): Promise<{ raw: string; hashed: string }> {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const raw = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return { raw, hashed: await sha256Hex(raw) };
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

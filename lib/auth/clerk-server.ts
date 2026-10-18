import { createClerkClient, verifyToken, type User } from "@clerk/backend";
import { cookies, headers } from "next/headers";
import { AUTH_IDENTITY_HEADER, verifyAuthIdentity } from "@/lib/auth/auth-header-signature";
import { CLERK_SESSION_COOKIE } from "@/lib/auth/clerk-session-cookie";

export type ClerkAuthState = {
  isAuthenticated: boolean;
  userId: string | null;
};

function clerkSecretKey(): string {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Clerk server configuration is unavailable.");
  }
  return secretKey;
}

export async function getClerkAuth(): Promise<ClerkAuthState> {
  // Only an identity signed by proxy.ts is trusted. Unsigned or forged
  // headers fall through to the verified Clerk session cookie below.
  const requestHeaders = await headers();
  const signedUserId = await verifyAuthIdentity(requestHeaders.get(AUTH_IDENTITY_HEADER));
  if (signedUserId) return { isAuthenticated: true, userId: signedUserId };

  const token = (await cookies()).get(CLERK_SESSION_COOKIE)?.value;
  if (!token) return { isAuthenticated: false, userId: null };

  try {
    const payload = await verifyToken(token, { secretKey: clerkSecretKey() });
    return {
      isAuthenticated: Boolean(payload.sub),
      userId: payload.sub ?? null,
    };
  } catch (error) {
    const details = error && typeof error === "object"
      ? {
          name: "name" in error ? String(error.name) : "Unknown",
          message: "message" in error ? String(error.message) : "",
          code: "code" in error ? String(error.code) : "",
          status: "status" in error ? String(error.status) : "",
          errors: "errors" in error && Array.isArray(error.errors)
            ? error.errors.map((item) => item && typeof item === "object" && "code" in item ? String(item.code) : "")
            : [],
        }
      : { name: "Unknown", message: "", code: "", status: "", errors: [] };
    console.error("[auth] Clerk session verification failed:", JSON.stringify(details));
    return { isAuthenticated: false, userId: null };
  }
}

export async function getCurrentClerkUser(userId: string): Promise<User> {
  return createClerkClient({ secretKey: clerkSecretKey() }).users.getUser(userId);
}

/** Deletes the Clerk user. A user that is already gone counts as deleted so retries succeed. */
export async function deleteClerkUser(userId: string): Promise<void> {
  try {
    await createClerkClient({ secretKey: clerkSecretKey() }).users.deleteUser(userId);
  } catch (error) {
    const status = error && typeof error === "object" && "status" in error ? Number(error.status) : undefined;
    if (status === 404) return;
    throw error;
  }
}

import { createClerkClient, verifyToken, type User } from "@clerk/backend";
import { cookies, headers } from "next/headers";
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
  const requestHeaders = await headers();
  const isAuthenticated = requestHeaders.get("x-clerk-auth-status") === "signed-in";
  const userId = requestHeaders.get("x-budget-buddy-user-id")?.trim() || null;

  if (isAuthenticated && userId) return { isAuthenticated: true, userId };

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

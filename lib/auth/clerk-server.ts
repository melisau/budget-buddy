import { createClerkClient, verifyToken, type User } from "@clerk/backend";
import { cookies, headers } from "next/headers";

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

async function sessionToken(): Promise<string | null> {
  const requestHeaders = await headers();
  const middlewareToken = requestHeaders.get("x-clerk-auth-token")?.trim();
  if (middlewareToken) return middlewareToken;

  return (await cookies()).get("__session")?.value ?? null;
}

export async function getClerkAuth(): Promise<ClerkAuthState> {
  const token = await sessionToken();
  if (!token) return { isAuthenticated: false, userId: null };

  try {
    const payload = await verifyToken(token, { secretKey: clerkSecretKey() });
    return {
      isAuthenticated: Boolean(payload.sub),
      userId: payload.sub ?? null,
    };
  } catch {
    return { isAuthenticated: false, userId: null };
  }
}

export async function getCurrentClerkUser(userId: string): Promise<User> {
  return createClerkClient({ secretKey: clerkSecretKey() }).users.getUser(userId);
}

// Stand-in for lib/auth/clerk-server.ts. Tests choose the signed-in Clerk user.
let currentClerkUserId: string | null = null;

export function setSignedInClerkUser(id: string | null) {
  currentClerkUserId = id;
}

export async function getClerkAuth() {
  return { isAuthenticated: currentClerkUserId !== null, userId: currentClerkUserId };
}

export async function getCurrentClerkUser(userId: string) {
  return { id: userId };
}

export async function deleteClerkUser() {}

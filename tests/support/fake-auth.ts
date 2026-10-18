// Stand-in for lib/auth/supabase-server.ts. Tests choose the verified user.
let currentAuthUserId: string | null = null;

export function setSignedInAuthUser(id: string | null) {
  currentAuthUserId = id;
}

export async function getCurrentUser() {
  return currentAuthUserId
    ? { id: currentAuthUserId, email: `${currentAuthUserId}@example.com`, email_confirmed_at: "2026-10-18T00:00:00Z", user_metadata: {} }
    : null;
}

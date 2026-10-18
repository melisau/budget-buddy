// Stand-in for lib/auth/app-user.ts: tests seed users directly.
export function toAppUserIdentity(user: { id: string }) {
  return { clerkUserId: user.id };
}

export async function syncAppUser() {}

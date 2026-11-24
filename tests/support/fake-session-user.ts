// Stand-in for lib/auth/session-user.ts. Reports the fast path as unavailable,
// so tests take the fallback that reads the user chosen in fake-auth.ts.
export async function readSessionUser() {
  return { kind: "unavailable" as const };
}

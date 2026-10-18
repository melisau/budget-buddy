import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProtectedShell } from "@/components/layout/protected-shell";
import { isAppUserFresh, syncAppUser, toAppUserIdentity } from "@/lib/auth/app-user";
import { getClerkAuth, getCurrentClerkUser } from "@/lib/auth/clerk-server";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, userId } = await getClerkAuth();
  if (!isAuthenticated || !userId) redirect("/sign-in");

  // Refresh the stored profile from Clerk at most once a day (or when the
  // user is new); otherwise a single database lookup is enough.
  if (!(await isAppUserFresh(userId))) {
    const user = await getCurrentClerkUser(userId);
    await syncAppUser(toAppUserIdentity(user));
  }

  return <ProtectedShell>{children}</ProtectedShell>;
}

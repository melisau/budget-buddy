import { redirect } from "next/navigation";
import { ProtectedShell } from "@/components/layout/protected-shell";
import { syncAppUser, toAppUserIdentity } from "@/lib/auth/app-user";
import { getClerkAuth, getCurrentClerkUser } from "@/lib/auth/clerk-server";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, userId } = await getClerkAuth();
  if (!isAuthenticated || !userId) redirect("/sign-in");

  const user = await getCurrentClerkUser(userId);
  await syncAppUser(toAppUserIdentity(user));

  return <ProtectedShell>{children}</ProtectedShell>;
}

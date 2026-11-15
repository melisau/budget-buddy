import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProtectedShell } from "@/components/layout/protected-shell";
import { syncAppUser } from "@/lib/auth/app-user";
import { getAuthState } from "@/lib/auth/supabase-server";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, secondStepPending } = await getAuthState();
  if (!user) redirect("/sign-in");
  if (secondStepPending) redirect("/auth/two-step");
  await syncAppUser();

  return <ProtectedShell>{children}</ProtectedShell>;
}

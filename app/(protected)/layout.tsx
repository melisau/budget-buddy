import { redirect } from "next/navigation";
import { ProtectedShell } from "@/components/layout/protected-shell";
import { syncAppUser } from "@/lib/auth/app-user";
import { getCurrentUser } from "@/lib/auth/supabase-server";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  await syncAppUser();

  return <ProtectedShell>{children}</ProtectedShell>;
}

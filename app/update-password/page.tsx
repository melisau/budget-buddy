import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthState } from "@/lib/auth/supabase-server";
import { AuthPage } from "@/components/auth/auth-page";
export const metadata: Metadata = { title: "Choose a new password", robots: { index: false, follow: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { user, secondStepPending } = await getAuthState();
  if (!user) redirect("/forgot-password");
  // A reset link alone must not change the password of a two-step account.
  if (secondStepPending) redirect("/auth/two-step?redirect=%2Fupdate-password");
  return <AuthPage mode="update-password" errorCode={(await searchParams).error} />;
}

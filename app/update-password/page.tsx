import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/supabase-server";
import { AuthPage } from "@/components/auth/auth-page";
export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (!await getCurrentUser()) redirect("/forgot-password");
  return <AuthPage mode="update-password" errorCode={(await searchParams).error} />;
}

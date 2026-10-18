import type { Metadata } from "next";
import { AuthPage } from "@/components/auth/auth-page";
export const metadata: Metadata = { title: "Reset password", robots: { index: false, follow: true } };

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string; status?: string }> }) {
  const { error, status } = await searchParams;
  return <AuthPage mode="forgot-password" errorCode={error} status={status} />;
}

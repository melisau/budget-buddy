import { AuthPage } from "@/components/auth/auth-page";
export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string; status?: string }> }) {
  const { error, status } = await searchParams;
  return <AuthPage mode="forgot-password" errorCode={error} status={status} />;
}

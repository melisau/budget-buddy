import { AuthPage } from "@/components/auth/auth-page";

export default async function Page({ searchParams }: { searchParams: Promise<{ redirect?: string; error?: string; status?: string }> }) {
	const { redirect, error, status } = await searchParams;
	return <AuthPage mode="sign-up" errorCode={error} status={status} redirectTo={redirect === "/family" ? "/family" : "/dashboard"} />;
}

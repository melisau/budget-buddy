import { AuthPage } from "@/components/auth/auth-page";

export default async function Page({ searchParams }: { searchParams: Promise<{ redirect?: string; error?: string }> }) {
	const { redirect, error } = await searchParams;
	return <AuthPage mode="sign-in" errorCode={error} redirectTo={redirect === "/family" ? "/family" : "/dashboard"} />;
}

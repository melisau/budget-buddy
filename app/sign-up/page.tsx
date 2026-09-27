import { ClerkAuthPage } from "@/components/auth/clerk-auth-page";

export default async function Page({ searchParams }: { searchParams: Promise<{ redirect?: string }> }) {
	const { redirect } = await searchParams;
	return <ClerkAuthPage mode="sign-up" redirectTo={redirect === "/family" ? "/family" : "/dashboard"} />;
}

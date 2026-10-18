import type { Metadata } from "next";
import { ClerkAuthPage } from "@/components/auth/clerk-auth-page";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: true } };

export default async function Page({ searchParams }: { searchParams: Promise<{ redirect?: string }> }) {
	const { redirect } = await searchParams;
	return <ClerkAuthPage mode="sign-in" redirectTo={redirect === "/family" ? "/family" : "/dashboard"} />;
}

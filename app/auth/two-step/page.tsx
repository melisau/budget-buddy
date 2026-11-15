import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TwoStepChallenge } from "@/components/auth/two-step-challenge";
import { authDestination } from "@/lib/auth/redirect";
import { getAuthState } from "@/lib/auth/supabase-server";

export const metadata: Metadata = { title: "Two-step verification", robots: { index: false, follow: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ redirect?: string }> }) {
  const { user, secondStepPending } = await getAuthState();
  if (!user) redirect("/sign-in");
  const destination = authDestination((await searchParams).redirect);
  if (!secondStepPending) redirect(destination);
  return <TwoStepChallenge redirectTo={destination} />;
}

import { redirect } from "next/navigation";
import { getAuthState } from "@/lib/auth/supabase-server";
import { authDestination } from "@/lib/auth/redirect";

// Keep old bookmarks working, but never accept a legacy session cookie.
export default async function Page({ searchParams }: { searchParams: Promise<{ redirect?: string }> }) {
  const { user, secondStepPending } = await getAuthState();
  if (!user) redirect("/sign-in");
  const destination = authDestination((await searchParams).redirect);
  redirect(secondStepPending ? `/auth/two-step?redirect=${encodeURIComponent(destination)}` : destination);
}

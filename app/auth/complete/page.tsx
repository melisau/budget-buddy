import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/supabase-server";
import { authDestination } from "@/lib/auth/redirect";

// Keep old bookmarks working, but never accept a legacy session cookie.
export default async function Page({ searchParams }: { searchParams: Promise<{ redirect?: string }> }) {
  if (!await getCurrentUser()) redirect("/sign-in");
  redirect(authDestination((await searchParams).redirect));
}

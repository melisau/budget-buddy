import type { User } from "@clerk/backend";
import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type AppUserIdentity = {
  clerkUserId: string;
  displayName: string;
  email: string;
  imageUrl: string | null;
};

export function toAppUserIdentity(user: User): AppUserIdentity {
  const primaryEmail =
    user.emailAddresses.find((email) => email.id === user.primaryEmailAddressId)
      ?.emailAddress ?? user.emailAddresses[0]?.emailAddress;

  if (!primaryEmail) {
    throw new Error("The signed-in Clerk user does not have an email address.");
  }

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");

  return {
    clerkUserId: user.id,
    displayName: fullName || primaryEmail,
    email: primaryEmail,
    imageUrl: user.imageUrl || null,
  };
}

/** How long a synced profile is trusted before it is refreshed from Clerk. */
export const PROFILE_REFRESH_MS = 24 * 60 * 60 * 1000;

/**
 * True when the app user already exists, has starter data and was updated
 * recently, so the protected layout can skip the Clerk API call, the upsert
 * and the seeding call. One indexed lookup instead of three round trips.
 */
export async function isAppUserFresh(clerkUserId: string, now = Date.now()): Promise<boolean> {
  if (!isSupabaseConfigured()) return true;
  const { data, error } = await getSupabaseServerClient()
    .from("users")
    .select("id, updated_at, starter_data_seeded_at")
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();
  if (error || !data) return false;
  const updatedAt = typeof data.updated_at === "string" ? Date.parse(data.updated_at) : Number.NaN;
  return Boolean(data.starter_data_seeded_at) && Number.isFinite(updatedAt) && now - updatedAt < PROFILE_REFRESH_MS;
}

export async function syncAppUser(identity: AppUserIdentity): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("users")
    .upsert(
      {
        clerk_user_id: identity.clerkUserId,
        email: identity.email,
        name: identity.displayName,
        avatar_url: identity.imageUrl,
      },
      { onConflict: "clerk_user_id" },
    )
    .select("id, starter_data_seeded_at")
    .single();

  if (error) {
    throw new Error(`Unable to sync the signed-in user: ${error.message}`);
  }

  // Seeding is idempotent, but skip the extra round trip once it has run.
  if (data.starter_data_seeded_at) return;

  const { error: seedError } = await supabase.rpc("seed_user_starter_data", {
    p_user_id: data.id,
  });

  if (seedError) {
    throw new Error(`Unable to create starter data: ${seedError.message}`);
  }
}

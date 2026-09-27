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
    .select("id")
    .single();

  if (error) {
    throw new Error(`Unable to sync the signed-in user: ${error.message}`);
  }

  const { error: seedError } = await supabase.rpc("seed_user_starter_data", {
    p_user_id: data.id,
  });

  if (seedError) {
    throw new Error(`Unable to create starter data: ${seedError.message}`);
  }
}

import { NextResponse } from "next/server";
import { deleteAvatarFiles } from "@/lib/profile/avatar-server";
import { AccessError, requireAppUser } from "@/lib/auth/authorization";
import { sameOriginFormOrigin } from "@/lib/auth/request-origin";
import { getStripe } from "@/lib/billing/stripe";
import { deleteStoredReceipts } from "@/lib/finance/receipt-storage";
import { captureException } from "@/lib/monitoring/sentry";
import { createSupabaseAuthClient } from "@/lib/supabase/auth-server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const supportedCurrencies = new Set(["TRY", "EUR", "USD", "GBP"]);
const supportedLanguages = new Set(["en", "tr"]);

export async function GET() {
  try {
    const user = await requireAppUser();
    const { data, error } = await getSupabaseServerClient()
      .from("users")
      .select("currency, language")
      .eq("id", user.id)
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("[account] preferences could not be loaded", error);
    return NextResponse.json({ error: "Unable to load account preferences." }, { status: error instanceof AccessError ? error.status : 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireAppUser();
    const body = await request.json() as { currency?: unknown; language?: unknown };
    const updates: { currency?: string; language?: string } = {};
    if (typeof body.currency === "string" && supportedCurrencies.has(body.currency)) updates.currency = body.currency;
    if (typeof body.language === "string" && supportedLanguages.has(body.language)) updates.language = body.language;
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Choose a supported currency or language." }, { status: 400 });
    }
    const { data, error } = await getSupabaseServerClient()
      .from("users")
      .update(updates)
      .eq("id", user.id)
      .select("currency, language")
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("[account] preferences could not be updated", error);
    return NextResponse.json({ error: "Unable to update account preferences." }, { status: error instanceof AccessError ? error.status : 500 });
  }
}

async function logDeletionFailure(userId: string, step: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[account] deletion step "${step}" failed for app user ${userId}`, message);
  await captureException(error, { source: "server", path: "/api/account", userId, tags: { step } });
  try {
    await getSupabaseServerClient().from("error_events").insert({
      user_id: null,
      source: "server",
      message: `Account deletion: ${step} failed`.slice(0, 500),
      metadata: { appUserId: userId, step, error: message.slice(0, 1_000) },
    });
  } catch {
    // Logging must never mask the original failure.
  }
}

/**
 * Deletes the signed-in user's account.
 *
 * 1. Cancel any Stripe subscription first, so a deleted user is never billed.
 *    If this fails, nothing is deleted and the user can retry.
 * 2. Delete the Supabase Auth identity. The users row references auth.users
 *    with ON DELETE CASCADE, so the identity and all personal finance records
 *    are removed in one PostgreSQL transaction: either everything or nothing.
 * 3. Remove receipt files from Storage (not covered by SQL cascades).
 */
export async function DELETE(request: Request) {
  if (!sameOriginFormOrigin(request)) {
    return NextResponse.json({ error: "Same-origin request required." }, { status: 403 });
  }

  let user: Awaited<ReturnType<typeof requireAppUser>>;
  try {
    user = await requireAppUser();
  } catch (error) {
    return NextResponse.json({ error: "Sign in is required." }, { status: error instanceof AccessError ? error.status : 500 });
  }

  const supabase = getSupabaseServerClient();

  try {
    const { data: profile, error } = await supabase
      .from("users")
      .select("stripe_subscription_id")
      .eq("id", user.id)
      .single();
    if (error) throw error;

    const subscriptionId = profile?.stripe_subscription_id as string | null | undefined;
    if (subscriptionId) {
      try {
        await getStripe().subscriptions.cancel(subscriptionId);
      } catch (stripeError) {
        // An already-cancelled or missing subscription is not a blocker.
        const code = stripeError && typeof stripeError === "object" && "code" in stripeError ? String(stripeError.code) : "";
        if (code !== "resource_missing") throw stripeError;
      }
    }
  } catch (error) {
    await logDeletionFailure(user.id, "cancel-subscription", error);
    return NextResponse.json({ error: "Unable to cancel the subscription. Your account was not deleted." }, { status: 502 });
  }

  // Collect receipt paths before the cascade removes the rows that reference them.
  let receiptPaths: string[] = [];
  let avatarPath: string | null = null;
  try {
    const { data, error } = await supabase
      .from("transactions")
      .select("receipt_path")
      .eq("user_id", user.id)
      .not("receipt_path", "is", null);
    if (error) throw error;
    receiptPaths = (data ?? []).map((row) => row.receipt_path as string).filter(Boolean);
    const avatarProfile = await supabase.from("users").select("avatar_path").eq("id", user.id).single();
    if (avatarProfile.error) throw avatarProfile.error;
    avatarPath = avatarProfile.data?.avatar_path ?? null;
  } catch (error) {
    await logDeletionFailure(user.id, "list-receipts", error);
    return NextResponse.json({ error: "Unable to delete the account." }, { status: 500 });
  }

  const { error: deleteError } = await supabase.auth.admin.deleteUser(user.authUserId);
  if (deleteError) {
    await logDeletionFailure(user.id, "delete-identity", deleteError);
    return NextResponse.json({ error: "Unable to delete the account." }, { status: 500 });
  }

  try {
    await deleteStoredReceipts(receiptPaths);
  } catch (error) {
    await logDeletionFailure(user.id, "delete-receipts", error);
  }

  try {
    if (avatarPath) await deleteAvatarFiles(user.id, [avatarPath]);
  } catch (error) {
    await logDeletionFailure(user.id, "delete-avatar", error);
  }

  try {
    const client = await createSupabaseAuthClient();
    await client.auth.signOut({ scope: "local" });
  } catch {
    // The identity no longer exists; clearing local cookies is best effort.
  }
  return new NextResponse(null, { status: 204 });
}

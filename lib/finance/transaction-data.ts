import { requireFamilyWriteAccess, type AppUser } from "@/lib/auth/authorization";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ensureDefaultCategories } from "@/lib/finance/default-categories";

export type TransactionPayload = {
  type: "income" | "expense";
  amount: number;
  title: string;
  categoryId: string;
  accountId: string;
  date: string;
  note?: string;
  familyGroupId?: string;
};

const transactionSelect = "id, type, amount, title, note, transaction_date, family_group_id, owner_user_id, created_by_user_id, receipt_path, receipt_content_type, account:accounts(id, name), category:categories(id, name)";

async function assertPersonalReferences(user: AppUser, payload: TransactionPayload) {
  const supabase = getSupabaseServerClient();
  const [accountResult, categoryResult] = await Promise.all([
    supabase.from("accounts").select("id").eq("id", payload.accountId).eq("user_id", user.id).maybeSingle(),
    supabase.from("categories").select("id, type").eq("id", payload.categoryId).eq("user_id", user.id).maybeSingle(),
  ]);

  if (accountResult.error) throw new Error(`Unable to validate the selected account: ${accountResult.error.message}`);
  if (categoryResult.error) throw new Error(`Unable to validate the selected category: ${categoryResult.error.message}`);
  if (!accountResult.data || !categoryResult.data || categoryResult.data.type !== payload.type) {
    throw new Error("The selected account or category is unavailable.");
  }
}

export async function listTransactionData(user: AppUser) {
  await ensureDefaultCategories(user.id);
  const supabase = getSupabaseServerClient();
  const { data: memberships, error: membershipError } = await supabase
    .from("family_members")
    .select("family_group_id")
    .eq("user_id", user.id)
    .eq("invitation_status", "accepted");

  if (membershipError) throw new Error(`Unable to look up family memberships: ${membershipError.message}`);

  const familyIds = memberships.map((membership) => membership.family_group_id);
  const [personalResult, familyResult, accountsResult, categoriesResult] = await Promise.all([
    supabase.from("transactions").select(transactionSelect).eq("user_id", user.id).order("transaction_date", { ascending: false }).order("created_at", { ascending: false }),
    familyIds.length
      ? supabase.from("transactions").select(transactionSelect).in("family_group_id", familyIds).order("transaction_date", { ascending: false }).order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    supabase.from("accounts").select("id, name").eq("user_id", user.id).is("archived_at", null).order("name"),
    supabase.from("categories").select("id, name, type").eq("user_id", user.id).order("name"),
  ]);

  for (const result of [personalResult, familyResult, accountsResult, categoriesResult]) {
    if (result.error) throw new Error(`Unable to load transaction data: ${result.error.message}`);
  }

  const transactions = [...(personalResult.data ?? []), ...(familyResult.data ?? [])];
  const uniqueTransactions = [...new Map(transactions.map((transaction) => [transaction.id, transaction])).values()]
    .sort((left, right) => `${right.transaction_date}${right.id}`.localeCompare(`${left.transaction_date}${left.id}`));

  return {
    transactions: uniqueTransactions,
    accounts: accountsResult.data ?? [],
    categories: categoriesResult.data ?? [],
  };
}

export async function createTransaction(user: AppUser, payload: TransactionPayload) {
  await assertPersonalReferences(user, payload);
  const supabase = getSupabaseServerClient();

  if (payload.familyGroupId) {
    await requireFamilyWriteAccess(user.id, payload.familyGroupId);
  }

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      user_id: user.id,
      owner_user_id: user.id,
      created_by_user_id: user.id,
      family_group_id: payload.familyGroupId ?? null,
      account_id: payload.accountId,
      category_id: payload.categoryId,
      type: payload.type,
      amount: payload.amount,
      title: payload.title,
      note: payload.note || null,
      transaction_date: payload.date,
    })
    .select(transactionSelect)
    .single();

  if (error) throw new Error(`Unable to create the transaction: ${error.message}`);
  return data;
}

export async function updateTransaction(user: AppUser, transactionId: string, payload: TransactionPayload) {
  await assertPersonalReferences(user, payload);
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("transactions")
    .update({
      account_id: payload.accountId,
      category_id: payload.categoryId,
      type: payload.type,
      amount: payload.amount,
      title: payload.title,
      note: payload.note || null,
      transaction_date: payload.date,
    })
    .eq("id", transactionId)
    .select(transactionSelect)
    .single();

  if (error) throw new Error(`Unable to update the transaction: ${error.message}`);
  return data;
}

export async function deleteTransaction(transactionId: string) {
  const supabase = getSupabaseServerClient();
  const { data: transaction, error: lookupError } = await supabase.from("transactions").select("receipt_path").eq("id", transactionId).maybeSingle();
  if (lookupError) throw new Error(`Unable to look up the transaction receipt: ${lookupError.message}`);
  const { error } = await supabase.from("transactions").delete().eq("id", transactionId);
  if (error) throw new Error(`Unable to delete the transaction: ${error.message}`);
  return transaction?.receipt_path ?? null;
}

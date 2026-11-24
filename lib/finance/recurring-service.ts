import "server-only";
import type { AppUser } from "@/lib/auth/authorization";
import { createDailyGate } from "@/lib/finance/daily-gate";
import { ensureDefaultAccount } from "@/lib/finance/default-account";
import { ensureDefaultCategories } from "@/lib/finance/default-categories";
import { afterSettling, dueOccurrences, monthlyEquivalent, nextOccurrenceAfter, reminderIsDue, type Frequency, type ReminderDays } from "@/lib/finance/recurring";
import { todayInIstanbul } from "@/lib/notifications/rules";
import { isMissingSchemaError } from "@/lib/supabase/schema-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type RecurringInput = {
  kind: "regular" | "subscription";
  type: "income" | "expense";
  title: string;
  amount: number;
  categoryId: string;
  accountId?: string;
  frequency: Frequency;
  startDate: string;
  endDate?: string;
  /** Days before the date to remind; null creates the transaction automatically. */
  reminderDays?: ReminderDays | null;
};

type Joined = { id: string; name: string } | { id: string; name: string }[] | null;
const first = (value: Joined) => (Array.isArray(value) ? value[0] ?? null : value);

const baseColumns = "id, kind, type, title, amount, frequency, start_date, next_date, end_date, active, category:categories(id, name), account:accounts(id, name)";
const columns = "id, kind, type, title, amount, frequency, start_date, next_date, end_date, active, reminder_days, category:categories(id, name), account:accounts(id, name)";

/**
 * Runs a query that reads reminder_days, and again without it while migration
 * 0030 is not applied yet, so the app keeps working in between.
 */
async function withReminderFallback<T extends { error: unknown }>(run: (withReminder: boolean) => PromiseLike<T>): Promise<T> {
  const result = await run(true);
  return isMissingSchemaError(result.error) ? run(false) : result;
}

function toClient(row: Record<string, unknown>) {
  const category = first(row.category as Joined);
  const account = first(row.account as Joined);
  const amount = Number(row.amount);
  const frequency = row.frequency as Frequency;
  return {
    id: String(row.id),
    kind: row.kind === "subscription" ? "subscription" as const : "regular" as const,
    type: row.type === "income" ? "income" as const : "expense" as const,
    title: String(row.title),
    amount,
    frequency,
    monthlyAmount: monthlyEquivalent(amount, frequency),
    startDate: String(row.start_date),
    nextDate: String(row.next_date),
    endDate: typeof row.end_date === "string" ? row.end_date : null,
    active: row.active === true,
    reminderDays: typeof row.reminder_days === "number" ? row.reminder_days : null,
    categoryId: category?.id ?? "",
    categoryName: category?.name ?? "",
    accountId: account?.id ?? "",
    accountName: account?.name ?? "",
  };
}

async function assertReferences(user: AppUser, input: RecurringInput) {
  const supabase = getSupabaseServerClient();
  const [category, account] = await Promise.all([
    supabase.from("categories").select("id, type").eq("id", input.categoryId).eq("user_id", user.id).maybeSingle(),
    input.accountId ? supabase.from("accounts").select("id").eq("id", input.accountId).eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: { id: null }, error: null }),
  ]);
  if (category.error) throw category.error;
  if (account.error) throw account.error;
  if (!category.data || !account.data || category.data.type !== input.type) throw new Error("The selected account or category is unavailable.");
}

/** Dates before today are never back-filled; the schedule starts at the first date that is not in the past. */
function firstNextDate(input: RecurringInput, today: string) {
  return input.startDate >= today ? input.startDate : nextOccurrenceAfter(input.startDate, input.frequency, yesterday(today));
}

function yesterday(today: string) {
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

/**
 * Turns every item whose date has come into real transactions. Safe to call on
 * every page load: the database refuses a second transaction for the same
 * item and date, so repeated or concurrent calls create each one only once.
 * Returns how many transactions it created; 0 when the migration is missing.
 */
export async function materializeDueRecurring(user: AppUser): Promise<number> {
  const supabase = getSupabaseServerClient();
  const today = todayInIstanbul();
  // Items with a reminder wait for the user to mark the payment as paid or skipped.
  const due = await withReminderFallback((withReminder) => {
    const query = supabase.from("recurring_items")
      .select("id, kind, type, title, amount, category_id, account_id, frequency, start_date, next_date, end_date")
      .eq("user_id", user.id).eq("active", true).lte("next_date", today);
    return withReminder ? query.is("reminder_days", null) : query;
  });
  if (due.error) {
    if (isMissingSchemaError(due.error)) return 0;
    throw due.error;
  }
  let created = 0;
  for (const item of due.data ?? []) {
    const result = dueOccurrences({ startDate: item.start_date, frequency: item.frequency as Frequency, nextDate: item.next_date, endDate: item.end_date }, today);
    if (result.dates.length) {
      const accountId = item.account_id ?? await ensureDefaultAccount(user.id);
      const { data, error } = await supabase.from("transactions").upsert(
        result.dates.map((date) => ({
          user_id: user.id, owner_user_id: user.id, created_by_user_id: user.id,
          account_id: accountId, category_id: item.category_id, type: item.type,
          amount: item.amount, title: item.title, transaction_date: date, recurring_item_id: item.id,
        })),
        { onConflict: "recurring_item_id,transaction_date", ignoreDuplicates: true },
      ).select("id");
      if (error) throw error;
      created += data?.length ?? 0;
    }
    const { error } = await supabase.from("recurring_items")
      .update({ next_date: result.nextDate, active: !result.finished, updated_at: new Date().toISOString() })
      .eq("id", item.id).eq("user_id", user.id);
    if (error) throw error;
  }
  return created;
}

// Due dates only change at midnight or when an item changes, so after one
// successful run a user's items need no new check until tomorrow.
const dailyCheck = createDailyGate();

/**
 * Same as `materializeDueRecurring`, at most once a day per user, and a failure
 * never breaks the page that called it.
 */
export async function materializeDueRecurringSafely(user: AppUser): Promise<void> {
  const today = todayInIstanbul();
  if (dailyCheck.isDone(user.id, today)) return;
  try {
    await materializeDueRecurring(user);
    dailyCheck.markDone(user.id, today);
  } catch (error) {
    console.error("[recurring] could not create due transactions", error instanceof Error ? error.message : error);
  }
}

export type RecurringList = Awaited<ReturnType<typeof listRecurring>>;

export async function listRecurring(user: AppUser) {
  await ensureDefaultCategories(user.id);
  const supabase = getSupabaseServerClient();
  const unavailable = { available: false as const, items: [], categories: [], accounts: [], currency: "TRY" };
  try {
    await materializeDueRecurring(user);
  } catch (error) {
    // A failed run must not hide the items that exist.
    console.error("[recurring] could not create due transactions", error instanceof Error ? error.message : error);
  }
  const [items, categories, accounts, profile] = await Promise.all([
    withReminderFallback((withReminder) => supabase.from("recurring_items").select(withReminder ? columns : baseColumns).eq("user_id", user.id).order("next_date")),
    supabase.from("categories").select("id, name, type").eq("user_id", user.id).order("name"),
    supabase.from("accounts").select("id, name").eq("user_id", user.id).is("archived_at", null).order("name"),
    supabase.from("users").select("currency").eq("id", user.id).single(),
  ]);
  if (isMissingSchemaError(items.error)) return unavailable;
  for (const result of [items, categories, accounts, profile]) if (result.error) throw result.error;
  return {
    available: true as const,
    items: (items.data ?? []).map((row) => toClient(row as unknown as Record<string, unknown>)),
    categories: categories.data ?? [],
    accounts: accounts.data ?? [],
    currency: (profile.data?.currency as string | undefined) ?? "TRY",
  };
}

export async function createRecurring(user: AppUser, input: RecurringInput) {
  await assertReferences(user, input);
  const today = todayInIstanbul();
  const { data, error } = await getSupabaseServerClient().from("recurring_items").insert({
    user_id: user.id, kind: input.kind, type: input.type, title: input.title, amount: input.amount,
    category_id: input.categoryId, account_id: input.accountId ?? null, frequency: input.frequency,
    start_date: input.startDate, next_date: firstNextDate(input, today), end_date: input.endDate ?? null,
    reminder_days: input.reminderDays ?? null,
  }).select(columns).single();
  if (error) throw error;
  dailyCheck.forget(user.id);
  await materializeDueRecurringSafely(user);
  return toClient(data as Record<string, unknown>);
}

export async function updateRecurring(user: AppUser, id: string, input: RecurringInput) {
  await assertReferences(user, input);
  const today = todayInIstanbul();
  const { data, error } = await getSupabaseServerClient().from("recurring_items").update({
    kind: input.kind, type: input.type, title: input.title, amount: input.amount,
    category_id: input.categoryId, account_id: input.accountId ?? null, frequency: input.frequency,
    start_date: input.startDate, next_date: firstNextDate(input, today), end_date: input.endDate ?? null,
    reminder_days: input.reminderDays ?? null,
    updated_at: new Date().toISOString(),
  }).eq("id", id).eq("user_id", user.id).select(columns).maybeSingle();
  if (error) throw error;
  dailyCheck.forget(user.id);
  return data ? toClient(data as Record<string, unknown>) : null;
}

export async function setRecurringActive(user: AppUser, id: string, active: boolean) {
  const supabase = getSupabaseServerClient();
  const found = await supabase.from("recurring_items").select("frequency, start_date, end_date").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (found.error) throw found.error;
  if (!found.data) return false;
  // Resuming never back-fills the paused time: continue from the next date that is not in the past.
  const next = nextOccurrenceAfter(found.data.start_date, found.data.frequency as Frequency, yesterday(todayInIstanbul()));
  const { error } = await supabase.from("recurring_items")
    .update({ active, ...(active ? { next_date: next } : {}), updated_at: new Date().toISOString() })
    .eq("id", id).eq("user_id", user.id);
  if (error) throw error;
  dailyCheck.forget(user.id);
  return true;
}

/** Deleting an item keeps the transactions it already created. */
export async function deleteRecurring(user: AppUser, id: string) {
  const { error, count } = await getSupabaseServerClient().from("recurring_items").delete({ count: "exact" }).eq("id", id).eq("user_id", user.id);
  if (error) throw error;
  return (count ?? 0) > 0;
}

export type DueReminder = ReturnType<typeof toClient> & { currency: string };

/** Payments whose reminder window is open and that the user has not marked yet, oldest first. */
export async function listDueReminders(user: AppUser): Promise<DueReminder[]> {
  const supabase = getSupabaseServerClient();
  const today = todayInIstanbul();
  const [items, profile] = await Promise.all([
    supabase.from("recurring_items").select(columns).eq("user_id", user.id).eq("active", true)
      .not("reminder_days", "is", null).lte("next_date", addDaysTo(today, 7)).order("next_date"),
    supabase.from("users").select("currency").eq("id", user.id).single(),
  ]);
  if (isMissingSchemaError(items.error)) return [];
  if (items.error) throw items.error;
  if (profile.error) throw profile.error;
  const currency = (profile.data?.currency as string | undefined) ?? "TRY";
  return (items.data ?? [])
    .map((row) => toClient(row as Record<string, unknown>))
    .filter((item) => reminderIsDue(item.nextDate, item.reminderDays, today))
    .map((item) => ({ ...item, currency }));
}

/**
 * Marks the payment due on `date` as paid (records the transaction) or skipped,
 * and moves the item to its next date. `date` must be the item's current next
 * date, so a repeated or stale click cannot settle a payment twice.
 * Returns false when the item or that payment is not found.
 */
export async function settleRecurring(user: AppUser, id: string, date: string, paid: boolean): Promise<boolean> {
  const supabase = getSupabaseServerClient();
  const found = await supabase.from("recurring_items")
    .select("id, type, title, amount, category_id, account_id, frequency, start_date, next_date, end_date, active")
    .eq("id", id).eq("user_id", user.id).maybeSingle();
  if (found.error) throw found.error;
  const item = found.data;
  if (!item || !item.active || item.next_date !== date) return false;
  if (paid) {
    const accountId = item.account_id ?? await ensureDefaultAccount(user.id);
    const { error } = await supabase.from("transactions").upsert({
      user_id: user.id, owner_user_id: user.id, created_by_user_id: user.id,
      account_id: accountId, category_id: item.category_id, type: item.type,
      amount: item.amount, title: item.title, transaction_date: date, recurring_item_id: item.id,
    }, { onConflict: "recurring_item_id,transaction_date", ignoreDuplicates: true });
    if (error) throw error;
  }
  const next = afterSettling({ startDate: item.start_date, frequency: item.frequency as Frequency, endDate: item.end_date }, date);
  const { error, count } = await supabase.from("recurring_items")
    .update({ next_date: next.nextDate, active: !next.finished, updated_at: new Date().toISOString() }, { count: "exact" })
    .eq("id", id).eq("user_id", user.id).eq("next_date", date);
  if (error) throw error;
  return (count ?? 0) > 0;
}

function addDaysTo(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

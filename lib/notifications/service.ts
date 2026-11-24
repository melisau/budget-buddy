import "server-only";
import { captureException } from "@/lib/monitoring/sentry";
import { digestEmail } from "@/lib/notifications/email-templates";
import { isEmailConfigured, sendEmail } from "@/lib/notifications/email";
import {
  addDays, budgetNotification, emailedKinds, totalBudgetNotification, goalNotification, GOAL_DUE_DAYS, inviteNotification, recurringNotification, todayInIstanbul,
  type NotificationCandidate, type NotificationData, type NotificationKind,
} from "@/lib/notifications/rules";
import { SITE_URL } from "@/lib/site";
import { isMissingSchemaError } from "@/lib/supabase/schema-errors";
import { escapeLikePattern, fetchAllRows } from "@/lib/supabase/query";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type Person = { id: string; email: string | null };
export type StoredNotification = { id: string; kind: NotificationKind; data: NotificationData; readAt: string | null; createdAt: string };

const KEEP_DAYS = 90;
const EMAIL_WINDOW_DAYS = 3;
const LIST_LIMIT = 30;

/** Works out which notifications the user should have and stores the new ones. Returns how many were new. */
export async function syncNotificationsForUser(person: Person, currencyHint?: string): Promise<number> {
  const supabase = getSupabaseServerClient();
  const today = todayInIstanbul();
  const monthStart = `${today.slice(0, 8)}01`;
  let currency = currencyHint;
  if (!currency) {
    const profile = await supabase.from("users").select("currency").eq("id", person.id).single();
    if (profile.error) throw profile.error;
    currency = profile.data.currency as string;
  }

  const [budgets, goals, invites, reminders, totalBudget] = await Promise.all([
    supabase.from("budgets").select("id, category_id, amount_limit, start_date, end_date, category:categories(name)")
      .eq("user_id", person.id).is("family_group_id", null).eq("start_date", monthStart),
    supabase.from("goals").select("id, name, target_amount, current_amount, deadline")
      .eq("user_id", person.id).not("deadline", "is", null).gte("deadline", today).lte("deadline", addDays(today, GOAL_DUE_DAYS)),
    person.email
      ? supabase.from("family_members").select("id, family_group_id").eq("invitation_status", "pending").ilike("invited_email", escapeLikePattern(person.email.trim().toLowerCase()))
      : Promise.resolve({ data: [], error: null }),
    supabase.from("recurring_items").select("id, title, amount, type, next_date, reminder_days")
      .eq("user_id", person.id).eq("active", true).not("reminder_days", "is", null).lte("next_date", addDays(today, 7)),
    supabase.from("monthly_total_budgets").select("id, amount_limit").eq("user_id", person.id).eq("start_date", monthStart).maybeSingle(),
  ]);
  // Before migration 0032 there is no overall budget table: nothing to check.
  if (totalBudget.error && !isMissingSchemaError(totalBudget.error)) throw totalBudget.error;
  const total = totalBudget.error ? null : totalBudget.data;
  for (const result of [budgets, goals, invites]) if (result.error) throw result.error;
  // Before migration 0030 there is no reminder_days column: no reminders yet.
  if (reminders.error && !isMissingSchemaError(reminders.error)) throw reminders.error;

  const candidates: NotificationCandidate[] = [];

  if (budgets.data?.length || total) {
    const { data: expenses, error } = await fetchAllRows<{ category_id: string; amount: number | string; transaction_date: string; transfer_group_id: string | null }>(() => supabase.from("transactions").select("id, category_id, amount, transaction_date, transfer_group_id")
      .eq("user_id", person.id).is("family_group_id", null).eq("type", "expense").gte("transaction_date", monthStart));
    if (error) throw error;
    if (total) {
      // Transfers between the user's own accounts are not spending.
      const spent = (expenses ?? []).reduce((sum, expense) => expense.transfer_group_id ? sum : sum + Number(expense.amount), 0);
      const candidate = totalBudgetNotification({ id: total.id, limit: Number(total.amount_limit), spent, month: monthStart.slice(0, 7) }, currency);
      if (candidate) candidates.push(candidate);
    }
    for (const budget of budgets.data ?? []) {
      const spent = (expenses ?? []).reduce((total, expense) =>
        expense.category_id === budget.category_id && expense.transaction_date >= budget.start_date && (!budget.end_date || expense.transaction_date <= budget.end_date)
          ? total + Number(expense.amount) : total, 0);
      const category = Array.isArray(budget.category) ? budget.category[0] : budget.category;
      const candidate = budgetNotification({ id: budget.id, categoryName: category?.name ?? "—", limit: Number(budget.amount_limit), spent, month: monthStart.slice(0, 7) }, currency);
      if (candidate) candidates.push(candidate);
    }
  }

  for (const goal of goals.data ?? []) {
    const candidate = goalNotification({ id: goal.id, name: goal.name, targetAmount: Number(goal.target_amount), currentAmount: Number(goal.current_amount), deadline: goal.deadline }, today, currency);
    if (candidate) candidates.push(candidate);
  }

  for (const item of reminders.error ? [] : reminders.data ?? []) {
    const candidate = recurringNotification({ id: item.id, title: item.title, amount: Number(item.amount), type: item.type === "income" ? "income" : "expense", nextDate: item.next_date, reminderDays: item.reminder_days }, today, currency);
    if (candidate) candidates.push(candidate);
  }

  if (invites.data?.length) {
    const { data: groups, error } = await supabase.from("family_groups").select("id, name").in("id", invites.data.map((invite) => invite.family_group_id));
    if (error) throw error;
    const names = new Map((groups ?? []).map((group) => [group.id, group.name as string]));
    for (const invite of invites.data) candidates.push(inviteNotification(invite.id, names.get(invite.family_group_id) ?? "—"));
  }

  if (candidates.length === 0) return 0;
  const { data: inserted, error } = await supabase.from("notifications")
    .upsert(candidates.map((candidate) => ({ user_id: person.id, kind: candidate.kind, dedupe_key: candidate.dedupeKey, data: candidate.data })), { onConflict: "user_id,dedupe_key", ignoreDuplicates: true })
    .select("id");
  if (error) throw error;
  return inserted?.length ?? 0;
}

export type NotificationList = { available: boolean; notifications: StoredNotification[]; unreadCount: number; emailEnabled: boolean };

/** The bell's data. `available` is false until migration 0019 is applied. */
export async function loadNotifications(person: Person): Promise<NotificationList> {
  const supabase = getSupabaseServerClient();
  const unavailable: NotificationList = { available: false, notifications: [], unreadCount: 0, emailEnabled: true };
  try {
    await syncNotificationsForUser(person);
  } catch (error) {
    if (isMissingSchemaError(error)) return unavailable;
    // A failed sync must not hide notifications that already exist.
    console.error("[notifications] sync failed", error instanceof Error ? error.message : error);
  }
  const [list, unread, profile] = await Promise.all([
    supabase.from("notifications").select("id, kind, data, read_at, created_at").eq("user_id", person.id).order("created_at", { ascending: false }).limit(LIST_LIMIT),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", person.id).is("read_at", null),
    supabase.from("users").select("notify_email").eq("id", person.id).single(),
  ]);
  if (isMissingSchemaError(list.error) || isMissingSchemaError(profile.error)) return unavailable;
  if (list.error) throw list.error;
  if (unread.error) throw unread.error;
  return {
    available: true,
    unreadCount: unread.count ?? 0,
    emailEnabled: profile.data?.notify_email !== false,
    notifications: (list.data ?? []).map((row) => ({ id: row.id, kind: row.kind as NotificationKind, data: (row.data ?? {}) as NotificationData, readAt: row.read_at, createdAt: row.created_at })),
  };
}

export async function markNotificationsRead(userId: string, ids?: string[]): Promise<void> {
  let query = getSupabaseServerClient().from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", userId).is("read_at", null);
  if (ids) query = query.in("id", ids);
  const { error } = await query;
  if (error) throw error;
}

export async function setEmailNotifications(userId: string, enabled: boolean): Promise<void> {
  const { error } = await getSupabaseServerClient().from("users").update({ notify_email: enabled }).eq("id", userId);
  if (error) throw error;
}

export type JobSummary = { users: number; created: number; emailed: number; failed: number; emailConfigured: boolean };

/**
 * The daily job: creates every user's new notifications and e-mails each user
 * one digest of the new budget and goal ones. Called by the server's cron.
 * One user's failure never stops the others.
 */
export async function runNotificationJob(now = new Date()): Promise<JobSummary> {
  const supabase = getSupabaseServerClient();
  const emailConfigured = isEmailConfigured();
  const summary: JobSummary = { users: 0, created: 0, emailed: 0, failed: 0, emailConfigured };
  const emailSince = new Date(now.getTime() - EMAIL_WINDOW_DAYS * 86_400_000).toISOString();
  const pageSize = 200;

  for (let from = 0; ; from += pageSize) {
    const { data: people, error } = await supabase.from("users")
      .select("id, email, language, currency, notify_email").order("id").range(from, from + pageSize - 1);
    if (error) throw error;
    if (!people?.length) break;

    for (const person of people) {
      summary.users += 1;
      try {
        summary.created += await syncNotificationsForUser({ id: person.id, email: person.email }, person.currency);
        if (!emailConfigured || !person.email || person.notify_email === false) continue;
        const { data: pending, error: pendingError } = await supabase.from("notifications")
          .select("id, kind, data").eq("user_id", person.id).is("emailed_at", null).in("kind", [...emailedKinds]).gte("created_at", emailSince).order("created_at");
        if (pendingError) throw pendingError;
        if (!pending?.length) continue;
        const language = person.language === "en" ? "en" : "tr";
        await sendEmail(person.email, digestEmail(pending.map((row) => ({ kind: row.kind as NotificationKind, data: (row.data ?? {}) as NotificationData })), language, SITE_URL));
        const { error: markError } = await supabase.from("notifications").update({ emailed_at: now.toISOString() }).in("id", pending.map((row) => row.id));
        if (markError) throw markError;
        summary.emailed += 1;
      } catch (error) {
        summary.failed += 1;
        console.error(`[notifications] job failed for app user ${person.id}`, error instanceof Error ? error.message : error);
        await captureException(error, { source: "server", path: "/api/cron/notifications", userId: person.id });
      }
    }
    if (people.length < pageSize) break;
  }

  const { error: cleanupError } = await supabase.from("notifications").delete().lt("created_at", new Date(now.getTime() - KEEP_DAYS * 86_400_000).toISOString());
  if (cleanupError) console.error("[notifications] cleanup failed", cleanupError.message);
  return summary;
}

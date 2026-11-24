// Pure rules that decide which notifications a user should have. No database,
// no clock: callers pass the data and today's date, so this is easy to test.
import { reminderIsDue } from "@/lib/finance/recurring";

export const BUDGET_WARNING_PERCENT = 80;
export const GOAL_DUE_DAYS = 7;

export type NotificationKind = "budget_warning" | "budget_exceeded" | "goal_due" | "family_invite" | "recurring_due";
export type NotificationData = Record<string, string | number>;
export type NotificationCandidate = { kind: NotificationKind; dedupeKey: string; data: NotificationData };

/** Kinds that are also e-mailed. Invitations have their own e-mail, sent when they are created. */
export const emailedKinds: readonly NotificationKind[] = ["budget_warning", "budget_exceeded", "goal_due", "recurring_due"];

/** Today's date (YYYY-MM-DD) in Türkiye, where the app's users live. */
export function todayInIstanbul(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(now);
}

export function addDays(date: string, days: number): string {
  const result = new Date(`${date}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

export type BudgetInput = { id: string; categoryName: string; limit: number; spent: number; month: string };

/** One notification per budget, for the highest threshold it has crossed. */
export function budgetNotification(budget: BudgetInput, currency: string): NotificationCandidate | null {
  if (!(budget.limit > 0) || !(budget.spent >= 0)) return null;
  // Rounded down, so 79.9% is never announced as "80%".
  const usage = Math.floor((budget.spent / budget.limit) * 100);
  const kind = usage >= 100 ? "budget_exceeded" : usage >= BUDGET_WARNING_PERCENT ? "budget_warning" : null;
  if (!kind) return null;
  return {
    kind,
    dedupeKey: `budget:${budget.id}:${kind === "budget_exceeded" ? 100 : BUDGET_WARNING_PERCENT}`,
    data: { categoryName: budget.categoryName, usage, limit: budget.limit, spent: budget.spent, month: budget.month, currency },
  };
}

export type GoalInput = { id: string; name: string; targetAmount: number; currentAmount: number; deadline: string | null };

/** A goal that is not reached yet and is due within the next GOAL_DUE_DAYS days. */
export function goalNotification(goal: GoalInput, today: string, currency: string): NotificationCandidate | null {
  if (!goal.deadline || goal.currentAmount >= goal.targetAmount) return null;
  const daysLeft = daysBetween(today, goal.deadline);
  if (daysLeft < 0 || daysLeft > GOAL_DUE_DAYS) return null;
  return {
    kind: "goal_due",
    dedupeKey: `goal:${goal.id}:${goal.deadline}`,
    data: { goalName: goal.name, deadline: goal.deadline, daysLeft, remaining: Math.max(0, goal.targetAmount - goal.currentAmount), currency },
  };
}

export function inviteNotification(invitationId: string, groupName: string): NotificationCandidate {
  return { kind: "family_invite", dedupeKey: `invite:${invitationId}`, data: { groupName } };
}

export type RecurringReminderInput = { id: string; title: string; amount: number; type: "income" | "expense"; nextDate: string; reminderDays: number | null };

/** A recurring payment whose reminder window has opened. One per item and date. */
export function recurringNotification(item: RecurringReminderInput, today: string, currency: string): NotificationCandidate | null {
  if (!reminderIsDue(item.nextDate, item.reminderDays, today)) return null;
  return {
    kind: "recurring_due",
    dedupeKey: `recurring:${item.id}:${item.nextDate}`,
    data: { title: item.title, amount: item.amount, type: item.type, dueDate: item.nextDate, daysLeft: daysBetween(today, item.nextDate), currency },
  };
}

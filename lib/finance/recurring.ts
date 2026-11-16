// Pure date rules for recurring items (rent, salary, bills, subscriptions).
// No imports, so it can be unit-tested directly.

export type Frequency = "weekly" | "monthly" | "yearly";
export const frequencies: readonly Frequency[] = ["weekly", "monthly", "yearly"];

/** How many missed occurrences one run may create; older ones are skipped. */
export const MAX_CATCH_UP = 36;
const MAX_STEPS = 20_000;

function split(date: string): [number, number, number] {
  const [year, month, day] = date.split("-").map(Number);
  return [year, month, day];
}

function format(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * The n-th occurrence (0 is the start date). Always counted from the start
 * date, so a rent due on the 31st stays on the 31st in months that have it
 * instead of drifting to the 28th after February.
 */
export function occurrenceAt(start: string, frequency: Frequency, n: number): string {
  const [year, month, day] = split(start);
  if (frequency === "weekly") {
    return new Date(Date.UTC(year, month - 1, day + 7 * n)).toISOString().slice(0, 10);
  }
  if (frequency === "monthly") {
    const total = month - 1 + n;
    const targetYear = year + Math.floor(total / 12);
    const targetMonth = (total % 12) + 1;
    return format(targetYear, targetMonth, Math.min(day, daysInMonth(targetYear, targetMonth)));
  }
  const targetYear = year + n;
  return format(targetYear, month, Math.min(day, daysInMonth(targetYear, month)));
}

/** Occurrences with `from <= date <= to`, oldest first. */
export function occurrencesBetween(start: string, frequency: Frequency, from: string, to: string): string[] {
  const dates: string[] = [];
  for (let n = 0; n < MAX_STEPS; n += 1) {
    const date = occurrenceAt(start, frequency, n);
    if (date > to) break;
    if (date >= from) dates.push(date);
  }
  return dates;
}

/** The first occurrence strictly after `after`. */
export function nextOccurrenceAfter(start: string, frequency: Frequency, after: string): string {
  for (let n = 0; n < MAX_STEPS; n += 1) {
    const date = occurrenceAt(start, frequency, n);
    if (date > after) return date;
  }
  return occurrenceAt(start, frequency, MAX_STEPS);
}

export type RecurringSchedule = { startDate: string; frequency: Frequency; nextDate: string; endDate: string | null };

/**
 * What to create today: every occurrence from `nextDate` up to today (and up
 * to the end date), the new `nextDate`, and whether the schedule is over.
 */
export function dueOccurrences(schedule: RecurringSchedule, today: string): { dates: string[]; nextDate: string; finished: boolean } {
  const upTo = schedule.endDate && schedule.endDate < today ? schedule.endDate : today;
  const all = occurrencesBetween(schedule.startDate, schedule.frequency, schedule.nextDate, upTo);
  const dates = all.slice(-MAX_CATCH_UP);
  const nextDate = nextOccurrenceAfter(schedule.startDate, schedule.frequency, upTo);
  return { dates, nextDate, finished: schedule.endDate !== null && nextDate > schedule.endDate };
}

/** Cost per month, so weekly, monthly and yearly subscriptions can be added up. */
export function monthlyEquivalent(amount: number, frequency: Frequency): number {
  const perMonth = frequency === "weekly" ? (amount * 52) / 12 : frequency === "yearly" ? amount / 12 : amount;
  return Math.round(perMonth * 100) / 100;
}

/** Whole days from `today` to `date` (negative when it is in the past). */
export function daysUntil(date: string, today: string): number {
  const [ay, am, ad] = split(today);
  const [by, bm, bd] = split(date);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

/** Popular subscriptions offered as one-tap presets. */
export const subscriptionPresets = ["Spotify", "Netflix", "YouTube Premium", "Disney+", "Amazon Prime", "Apple iCloud", "Claude", "ChatGPT", "Google One", "Exxen"] as const;

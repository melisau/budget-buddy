import assert from "node:assert/strict";
import test from "node:test";
import { afterSettling, brandFor, parseReminderDays, reminderIsDue } from "../lib/finance/recurring.ts";
import { recurringNotification } from "../lib/notifications/rules.ts";
import { renderNotification } from "../lib/notifications/messages.ts";

test("only the offered reminder choices are accepted", () => {
  assert.equal(parseReminderDays("1"), 1);
  assert.equal(parseReminderDays(7), 7);
  assert.equal(parseReminderDays(""), null);
  assert.equal(parseReminderDays(5), null);
  assert.equal(parseReminderDays(null), null);
});

test("the reminder opens N days before and stays open until settled", () => {
  assert.equal(reminderIsDue("2026-12-01", 1, "2026-11-29"), false);
  assert.equal(reminderIsDue("2026-12-01", 1, "2026-11-30"), true);
  assert.equal(reminderIsDue("2026-12-01", 0, "2026-12-01"), true);
  assert.equal(reminderIsDue("2026-12-01", 7, "2026-12-05"), true);
  assert.equal(reminderIsDue("2026-12-01", null, "2026-12-01"), false);
});

test("settling moves to the next date and ends after the end date", () => {
  assert.deepEqual(afterSettling({ startDate: "2026-01-31", frequency: "monthly", endDate: null }, "2026-11-30"), { nextDate: "2026-12-31", finished: false });
  assert.deepEqual(afterSettling({ startDate: "2026-11-01", frequency: "monthly", endDate: "2026-11-30" }, "2026-11-01"), { nextDate: "2026-12-01", finished: true });
});

test("a due reminder becomes one notification per item and date", () => {
  const item = { id: "r1", title: "Netflix", amount: 149.99, type: "expense" as const, nextDate: "2026-12-01", reminderDays: 1 };
  assert.equal(recurringNotification(item, "2026-11-29", "TRY"), null);
  const candidate = recurringNotification(item, "2026-11-30", "TRY");
  assert.equal(candidate?.dedupeKey, "recurring:r1:2026-12-01");
  const text = renderNotification("recurring_due", candidate!.data, "tr");
  assert.match(text.title, /Netflix ödemesi yarın/);
  assert.equal(text.href, "/recurring");
});

test("preset names get a brand badge, case-insensitive", () => {
  assert.equal(brandFor("netflix")?.color, "#E50914");
  assert.equal(brandFor("Ev kirası"), null);
});

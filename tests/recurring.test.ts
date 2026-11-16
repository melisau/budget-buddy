import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { daysUntil, dueOccurrences, MAX_CATCH_UP, monthlyEquivalent, nextOccurrenceAfter, occurrenceAt, occurrencesBetween } from "../lib/finance/recurring.ts";

describe("occurrences", () => {
  test("monthly keeps the day, and clamps to short months without drifting", () => {
    assert.equal(occurrenceAt("2026-01-31", "monthly", 1), "2026-02-28");
    assert.equal(occurrenceAt("2026-01-31", "monthly", 2), "2026-03-31");
    assert.equal(occurrenceAt("2026-01-31", "monthly", 13), "2027-02-28");
    assert.equal(occurrenceAt("2026-11-15", "monthly", 2), "2027-01-15");
  });

  test("weekly adds seven days, across month and year ends", () => {
    assert.equal(occurrenceAt("2026-12-28", "weekly", 1), "2027-01-04");
    assert.equal(occurrenceAt("2026-11-02", "weekly", 0), "2026-11-02");
  });

  test("yearly keeps the date and handles 29 February", () => {
    assert.equal(occurrenceAt("2024-02-29", "yearly", 1), "2025-02-28");
    assert.equal(occurrenceAt("2024-02-29", "yearly", 4), "2028-02-29");
    assert.equal(occurrenceAt("2026-03-10", "yearly", 2), "2028-03-10");
  });

  test("occurrencesBetween is inclusive on both ends", () => {
    assert.deepEqual(occurrencesBetween("2026-01-15", "monthly", "2026-02-15", "2026-04-15"), ["2026-02-15", "2026-03-15", "2026-04-15"]);
    assert.deepEqual(occurrencesBetween("2026-01-15", "monthly", "2026-02-16", "2026-03-14"), []);
  });

  test("the next occurrence is strictly after the given day", () => {
    assert.equal(nextOccurrenceAfter("2026-01-15", "monthly", "2026-03-15"), "2026-04-15");
    assert.equal(nextOccurrenceAfter("2026-01-15", "monthly", "2026-03-14"), "2026-03-15");
  });
});

describe("due occurrences", () => {
  const rent = { startDate: "2026-09-01", frequency: "monthly" as const, nextDate: "2026-09-01", endDate: null };

  test("creates every missed month up to today and moves the next date on", () => {
    const result = dueOccurrences(rent, "2026-11-16");
    assert.deepEqual(result.dates, ["2026-09-01", "2026-10-01", "2026-11-01"]);
    assert.equal(result.nextDate, "2026-12-01");
    assert.equal(result.finished, false);
  });

  test("nothing is due before the next date, and a second run is a no-op", () => {
    const first = dueOccurrences(rent, "2026-11-16");
    const second = dueOccurrences({ ...rent, nextDate: first.nextDate }, "2026-11-16");
    assert.deepEqual(second.dates, []);
    assert.equal(second.nextDate, "2026-12-01");
  });

  test("an item due today is created today", () => {
    assert.deepEqual(dueOccurrences({ ...rent, nextDate: "2026-11-01" }, "2026-11-01").dates, ["2026-11-01"]);
  });

  test("stops at the end date and reports the schedule as finished", () => {
    const result = dueOccurrences({ ...rent, endDate: "2026-10-15" }, "2026-11-16");
    assert.deepEqual(result.dates, ["2026-09-01", "2026-10-01"]);
    assert.equal(result.finished, true);
  });

  test("a long gap only creates the most recent occurrences", () => {
    const weekly = { startDate: "2020-01-06", frequency: "weekly" as const, nextDate: "2020-01-06", endDate: null };
    const result = dueOccurrences(weekly, "2026-11-16");
    assert.equal(result.dates.length, MAX_CATCH_UP);
    assert.ok(result.dates.every((date) => date <= "2026-11-16"));
    assert.ok(result.nextDate > "2026-11-16");
  });
});

describe("subscription cost", () => {
  test("converts every frequency to a monthly cost", () => {
    assert.equal(monthlyEquivalent(100, "monthly"), 100);
    assert.equal(monthlyEquivalent(1200, "yearly"), 100);
    assert.equal(monthlyEquivalent(10, "weekly"), 43.33);
  });

  test("counts days until a renewal", () => {
    assert.equal(daysUntil("2026-11-20", "2026-11-16"), 4);
    assert.equal(daysUntil("2026-11-16", "2026-11-16"), 0);
    assert.equal(daysUntil("2026-11-10", "2026-11-16"), -6);
  });
});

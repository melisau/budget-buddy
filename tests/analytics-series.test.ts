import assert from "node:assert/strict";
import test from "node:test";
import { analyticsSeries } from "../lib/finance/analytics-series.ts";

const items = [
  { type: "income" as const, amount: "1000", transaction_date: "2026-11-01" },
  { type: "expense" as const, amount: 200, transaction_date: "2026-11-09" },
  { type: "expense" as const, amount: 50, transaction_date: "2026-11-30" },
  { type: "expense" as const, amount: 70, transaction_date: "2026-09-02" },
];

test("one month is split into weekly chunks and the short tail joins the last week", () => {
  const series = analyticsSeries(items, "2026-11", 1);
  assert.equal(series.granularity, "week");
  assert.deepEqual(series.points.map((p) => [p.start, p.end]), [["2026-11-01", "2026-11-07"], ["2026-11-08", "2026-11-14"], ["2026-11-15", "2026-11-21"], ["2026-11-22", "2026-11-30"]]);
  assert.equal(series.points[0].income, 1000);
  assert.equal(series.points[1].expense, 200);
  assert.equal(series.points[3].expense, 50);
});

test("three months use Monday weeks clipped to the range", () => {
  const series = analyticsSeries(items, "2026-11", 3);
  assert.equal(series.granularity, "week");
  assert.equal(series.points[0].start, "2026-09-01");
  assert.equal(series.points.at(-1)?.end, "2026-11-30");
  assert.ok(series.points.length >= 13 && series.points.length <= 14);
  assert.equal(series.points.reduce((sum, p) => sum + p.expense, 0), 320);
});

test("six and twelve months use one point per month", () => {
  assert.equal(analyticsSeries(items, "2026-11", 6).points.length, 6);
  const year = analyticsSeries(items, "2026-11", 12);
  assert.equal(year.granularity, "month");
  assert.equal(year.points[0].start, "2025-12-01");
  assert.equal(year.points.at(-1)?.end, "2026-11-30");
});

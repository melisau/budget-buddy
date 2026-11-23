import assert from "node:assert/strict";
import { test } from "node:test";
import { createServerTiming } from "../lib/observability/server-timing.ts";

function clock(...values: number[]) {
  return () => values.shift() ?? 0;
}

test("reports each step and the total in Server-Timing format", async () => {
  const timing = createServerTiming(clock(0, 1, 11.25, 11.25, 31.5, 40));
  assert.equal(await timing.measure("auth", async () => "user"), "user");
  await timing.measure("totals", () => 1);
  assert.equal(timing.header(), "auth;dur=10.3, totals;dur=20.3, total;dur=40.0");
});

test("records a failed step and rethrows its error", async () => {
  const timing = createServerTiming(clock(0, 2, 7, 9));
  await assert.rejects(timing.measure("recent", async () => { throw new Error("failed"); }), /failed/);
  assert.equal(timing.header(), "recent;dur=5.0, total;dur=9.0");
});

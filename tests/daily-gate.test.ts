import assert from "node:assert/strict";
import { test } from "node:test";
import { createDailyGate } from "../lib/finance/daily-gate.ts";

test("a job runs again only on a new day or after it is forgotten", () => {
  const gate = createDailyGate();
  assert.equal(gate.isDone("user", "2026-11-24"), false);
  gate.markDone("user", "2026-11-24");
  assert.equal(gate.isDone("user", "2026-11-24"), true);
  assert.equal(gate.isDone("other", "2026-11-24"), false);
  assert.equal(gate.isDone("user", "2026-11-25"), false);
  gate.forget("user");
  assert.equal(gate.isDone("user", "2026-11-24"), false);
});

test("memory stays bounded", () => {
  const gate = createDailyGate(2);
  gate.markDone("a", "d");
  gate.markDone("b", "d");
  gate.markDone("c", "d");
  assert.equal(gate.isDone("c", "d"), true);
  assert.equal(gate.isDone("a", "d"), false);
});

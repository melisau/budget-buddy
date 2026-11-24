import assert from "node:assert/strict";
import test from "node:test";
import { totalBudgetNotification } from "../lib/notifications/rules.ts";
import { renderNotification } from "../lib/notifications/messages.ts";

test("the overall budget warns at 80% and again when exceeded, with its own keys", () => {
  const base = { id: "t1", limit: 20000, month: "2026-11" };
  assert.equal(totalBudgetNotification({ ...base, spent: 15000 }, "TRY"), null);
  const warning = totalBudgetNotification({ ...base, spent: 16500 }, "TRY");
  assert.equal(warning?.kind, "budget_warning");
  assert.equal(warning?.dedupeKey, "total-budget:t1:80");
  const over = totalBudgetNotification({ ...base, spent: 21000 }, "TRY");
  assert.equal(over?.dedupeKey, "total-budget:t1:100");
  assert.match(renderNotification(over!.kind, over!.data, "tr").title, /Genel aylık bütçeni aştın/);
  assert.match(renderNotification(warning!.kind, warning!.data, "tr").title, /%82/);
});

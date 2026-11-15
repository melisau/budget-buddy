import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { digestEmail, escapeHtml, inviteEmail } from "../lib/notifications/email-templates.ts";
import { renderNotification } from "../lib/notifications/messages.ts";
import { addDays, budgetNotification, goalNotification, inviteNotification, todayInIstanbul } from "../lib/notifications/rules.ts";
import { hasValidBearerSecret, secretsMatch } from "../lib/security/secret.ts";

const budget = (spent: number, limit = 1000) => ({ id: "b1", categoryName: "Market", limit, spent, month: "2026-11" });
const goal = (overrides: Partial<Parameters<typeof goalNotification>[0]> = {}) =>
  ({ id: "g1", name: "Tatil", targetAmount: 5000, currentAmount: 1000, deadline: "2026-11-20", ...overrides });

describe("budget notifications", () => {
  test("nothing below 80%", () => assert.equal(budgetNotification(budget(799), "TRY"), null));

  test("a warning from 80% up to 99%", () => {
    const warning = budgetNotification(budget(800), "TRY");
    assert.equal(warning?.kind, "budget_warning");
    assert.equal(warning?.dedupeKey, "budget:b1:80");
    assert.equal(budgetNotification(budget(994), "TRY")?.kind, "budget_warning");
  });

  test("exceeded from 100%, and only the highest threshold is reported", () => {
    const exceeded = budgetNotification(budget(1000), "TRY");
    assert.equal(exceeded?.kind, "budget_exceeded");
    assert.equal(exceeded?.dedupeKey, "budget:b1:100");
    assert.equal(budgetNotification(budget(2500), "TRY")?.data.usage, 250);
  });

  test("an invalid limit or amount gives nothing", () => {
    assert.equal(budgetNotification(budget(10, 0), "TRY"), null);
    assert.equal(budgetNotification(budget(-5), "TRY"), null);
  });
});

describe("goal notifications", () => {
  test("a goal due within a week is reported once per deadline", () => {
    const candidate = goalNotification(goal(), "2026-11-16", "TRY");
    assert.equal(candidate?.kind, "goal_due");
    assert.equal(candidate?.dedupeKey, "goal:g1:2026-11-20");
    assert.equal(candidate?.data.daysLeft, 4);
    assert.equal(candidate?.data.remaining, 4000);
  });

  test("today and the seventh day count; the eighth and yesterday do not", () => {
    assert.equal(goalNotification(goal({ deadline: "2026-11-16" }), "2026-11-16", "TRY")?.data.daysLeft, 0);
    assert.equal(goalNotification(goal({ deadline: "2026-11-23" }), "2026-11-16", "TRY")?.data.daysLeft, 7);
    assert.equal(goalNotification(goal({ deadline: "2026-11-24" }), "2026-11-16", "TRY"), null);
    assert.equal(goalNotification(goal({ deadline: "2026-11-15" }), "2026-11-16", "TRY"), null);
  });

  test("a reached goal or a goal without a deadline is skipped", () => {
    assert.equal(goalNotification(goal({ currentAmount: 5000 }), "2026-11-16", "TRY"), null);
    assert.equal(goalNotification(goal({ deadline: null }), "2026-11-16", "TRY"), null);
  });

  test("the deadline works across a month boundary", () => {
    assert.equal(goalNotification(goal({ deadline: "2026-12-02" }), "2026-11-28", "TRY")?.data.daysLeft, 4);
    assert.equal(addDays("2026-11-28", 7), "2026-12-05");
  });
});

test("an invitation has its own key", () => {
  assert.deepEqual(inviteNotification("m1", "Aile"), { kind: "family_invite", dedupeKey: "invite:m1", data: { groupName: "Aile" } });
});

test("today is the date in Türkiye, not UTC", () => {
  assert.equal(todayInIstanbul(new Date("2026-11-16T22:30:00Z")), "2026-11-17");
  assert.equal(todayInIstanbul(new Date("2026-11-16T10:00:00Z")), "2026-11-16");
});

describe("notification text", () => {
  const warning = budgetNotification(budget(850), "TRY")!;
  const goalDue = goalNotification(goal({ deadline: "2026-11-17" }), "2026-11-16", "TRY")!;

  test("follows the reader's language", () => {
    const tr = renderNotification(warning.kind, warning.data, "tr");
    const en = renderNotification(warning.kind, warning.data, "en");
    assert.match(tr.title, /Market bütçesinin %85/);
    assert.match(en.title, /85% of your Market budget/);
    assert.equal(tr.href, "/budgets");
    assert.match(renderNotification(goalDue.kind, goalDue.data, "tr").title, /yarın/);
    assert.match(renderNotification(goalDue.kind, goalDue.data, "en").title, /tomorrow/);
  });

  test("a stored currency code that is not a currency falls back safely", () => {
    const text = renderNotification("budget_exceeded", { categoryName: "X", usage: 120, limit: 100, spent: 120, currency: "<script>" }, "en");
    assert.doesNotMatch(text.body, /script/);
  });
});

describe("e-mail", () => {
  test("escapes HTML in names that users control", () => {
    assert.equal(escapeHtml(`<img src=x onerror="a">&'`), "&lt;img src=x onerror=&quot;a&quot;&gt;&amp;&#39;");
    const mail = inviteEmail(`<b>Aile</b>`, `Ali "<x>"`, "https://example.test");
    assert.doesNotMatch(mail.html, /<b>Aile<\/b>/);
    assert.doesNotMatch(mail.html, /<x>/);
    assert.match(mail.html, /&lt;b&gt;Aile&lt;\/b&gt;/);
  });

  test("the invitation is in both languages and links to sign-up", () => {
    const mail = inviteEmail("Aile", "Ali", "https://example.test");
    assert.match(mail.text, /aile grubuna davet etti/);
    assert.match(mail.text, /invited you to the family group/);
    assert.match(mail.text, /https:\/\/example\.test\/sign-up\?redirect=%2Ffamily/);
  });

  test("the digest lists every item, links the pages and explains how to opt out", () => {
    const items = [budgetNotification(budget(1200), "TRY")!, goalNotification(goal(), "2026-11-16", "TRY")!];
    const mail = digestEmail(items, "tr", "https://example.test");
    assert.match(mail.subject, /2 yeni bildirim/);
    assert.match(mail.text, /https:\/\/example\.test\/budgets/);
    assert.match(mail.text, /https:\/\/example\.test\/goals/);
    assert.match(mail.text, /https:\/\/example\.test\/settings/);
    assert.equal(digestEmail([items[0]], "en", "https://example.test").subject, renderNotification(items[0].kind, items[0].data, "en").title);
  });
});

describe("cron secret", () => {
  const secret = "0123456789abcdef-secret";
  const request = (authorization?: string) => new Request("https://example.test/api/cron/notifications", { method: "POST", headers: authorization ? { authorization } : {} });

  test("accepts only the exact bearer secret", () => {
    assert.equal(hasValidBearerSecret(request(`Bearer ${secret}`), secret), true);
    assert.equal(hasValidBearerSecret(request(`Bearer ${secret}x`), secret), false);
    assert.equal(hasValidBearerSecret(request(secret), secret), false);
    assert.equal(hasValidBearerSecret(request(), secret), false);
  });

  test("a missing or short secret never authorizes, even an empty header", () => {
    assert.equal(hasValidBearerSecret(request("Bearer "), ""), false);
    assert.equal(hasValidBearerSecret(request("Bearer short"), "short"), false);
    assert.equal(hasValidBearerSecret(request(), undefined), false);
  });

  test("compares secrets of different lengths without throwing", () => {
    assert.equal(secretsMatch("a", "abcdef"), false);
    assert.equal(secretsMatch("same", "same"), true);
  });
});

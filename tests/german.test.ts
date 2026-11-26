import assert from "node:assert/strict";
import test from "node:test";
import { germanOr, isLanguage, localeOf, localized } from "../lib/i18n/localized.ts";
import { categoryDisplayName } from "../lib/finance/category-names.ts";
import { renderNotification } from "../lib/notifications/messages.ts";

test("German is a supported language with its own locale", () => {
  assert.equal(isLanguage("de"), true);
  assert.equal(isLanguage("fr"), false);
  assert.equal(localeOf("de"), "de-DE");
});

test("English texts get their German version, unknown ones stay English", () => {
  assert.equal(localized("Dashboard", "de"), "Übersicht");
  assert.equal(localized("Dashboard", "en"), "Dashboard");
  assert.equal(localized("A text nobody translated", "de"), "A text nobody translated");
  assert.equal(germanOr("Hallo", "Hello", "de"), "Hallo");
});

test("default categories and notifications are German", () => {
  assert.equal(categoryDisplayName("Groceries", "de"), "Lebensmittel");
  const n = renderNotification("family_invite", { groupName: "Uyar" }, "de");
  assert.match(n.title, /eingeladen/);
});

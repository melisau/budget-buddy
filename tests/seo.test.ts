import assert from "node:assert/strict";
import test from "node:test";
import sitemap from "../app/sitemap.ts";
import { landingMetadata, landingStructuredData } from "../lib/seo/landing-metadata.ts";
import { LANDING_FAQ } from "../lib/seo/landing-faq.ts";
import { LANDING_LANGUAGE_BY_PATH, pageLanguage } from "../lib/seo/i18n.ts";
import { LEGAL_LAST_UPDATED_ISO } from "../lib/legal.ts";

test("sitemap lists both landing languages with reciprocal hreflang", () => {
  const entries = sitemap();
  const tr = entries.find((entry) => !new URL(entry.url).pathname.replace(/^\/$/, ""));
  const en = entries.find((entry) => entry.url.endsWith("/en"));
  assert.ok(tr && en, "both landing pages are listed");
  for (const entry of [tr, en]) {
    assert.deepEqual(Object.keys(entry.alternates?.languages ?? {}).sort(), ["en", "tr", "x-default"]);
  }
  assert.ok(entries.every((entry) => !/dashboard|settings|api|sign-in/.test(entry.url)), "no private pages");
});

test("each landing page is self-canonical and points to the other language", () => {
  const tr = landingMetadata("tr");
  const en = landingMetadata("en");
  assert.equal(tr.alternates?.canonical, "/");
  assert.equal(en.alternates?.canonical, "/en");
  assert.deepEqual(tr.alternates?.languages, { tr: "/", en: "/en", "x-default": "/" });
  assert.deepEqual(en.alternates?.languages, tr.alternates?.languages);
  assert.match(String((tr.title as { absolute: string }).absolute), /bütçe/i);
});

test("structured data is a valid schema.org graph without invented ratings", () => {
  const data = landingStructuredData("tr");
  const types = data["@graph"].map((node) => node["@type"]);
  assert.deepEqual(types, ["WebSite", "Organization", "WebPage", "SoftwareApplication", "FAQPage"]);
  assert.ok(!JSON.stringify(data).includes("aggregateRating"));
});

test("each landing page has FAQPage data in its own language, matching the page's translations", async () => {
  const { readFile } = await import("node:fs/promises");
  const translations = await readFile(new URL("../components/providers/language-provider.tsx", import.meta.url), "utf8");
  for (const language of ["tr", "en"] as const) {
    const faq = landingStructuredData(language)["@graph"].find((node) => node["@type"] === "FAQPage") as
      { mainEntity: { name: string; acceptedAnswer: { text: string } }[] } | undefined;
    assert.ok(faq, `${language} has FAQPage`);
    assert.equal(faq.mainEntity.length, LANDING_FAQ.length);
    LANDING_FAQ.forEach((item, index) => {
      assert.equal(faq.mainEntity[index].name, item[language][0]);
      assert.equal(faq.mainEntity[index].acceptedAnswer.text, item[language][1]);
    });
  }
  // The visible page translates the English text; the structured data must say the same.
  for (const item of LANDING_FAQ) {
    for (const index of [0, 1] as const) {
      assert.ok(translations.includes(JSON.stringify(item.en[index]) + ":" + JSON.stringify(item.tr[index])), `translation of "${item.en[index]}" matches`);
    }
  }
});

test("server HTML language follows the landing page and defaults to English", () => {
  assert.equal(LANDING_LANGUAGE_BY_PATH["/"], "tr");
  assert.equal(LANDING_LANGUAGE_BY_PATH["/en"], "en");
  assert.equal(pageLanguage("tr"), "tr");
  assert.equal(pageLanguage("en"), "en");
  assert.equal(pageLanguage(null), "en");
  assert.equal(pageLanguage("de"), "en");
});

test("sitemap dates are real dates and the privacy page uses the date it shows", () => {
  const entries = sitemap();
  for (const entry of entries) assert.ok(!Number.isNaN(new Date(entry.lastModified as Date).getTime()), entry.url);
  const privacy = entries.find((entry) => entry.url.endsWith("/privacy"));
  assert.equal((privacy?.lastModified as Date).toISOString().slice(0, 10), LEGAL_LAST_UPDATED_ISO);
});

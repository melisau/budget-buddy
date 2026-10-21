import assert from "node:assert/strict";
import test from "node:test";
import sitemap from "../app/sitemap.ts";
import { landingMetadata, landingStructuredData } from "../lib/seo/landing-metadata.ts";

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
  assert.deepEqual(types, ["WebSite", "Organization", "WebPage", "SoftwareApplication"]);
  assert.ok(!JSON.stringify(data).includes("aggregateRating"));
});

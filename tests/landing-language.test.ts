import assert from "node:assert/strict";
import test from "node:test";
import { landingPath, preferredLandingPath } from "../lib/seo/i18n.ts";

test("German and other browsers get their landing page, Turkish stays on /", () => {
  assert.equal(preferredLandingPath("de-DE,de;q=0.9,en;q=0.8"), "/de");
  assert.equal(preferredLandingPath("de-AT"), "/de");
  assert.equal(preferredLandingPath("tr-TR,tr;q=0.9,en;q=0.8"), null);
  assert.equal(preferredLandingPath("en-US,en;q=0.9"), "/en");
  assert.equal(preferredLandingPath("fr-FR,fr;q=0.9"), "/en");
  assert.equal(preferredLandingPath("en;q=0.5,de;q=0.9"), "/de");
  assert.equal(preferredLandingPath(""), null);
  assert.equal(preferredLandingPath(null), null);
});

test("each language has its own landing path", () => {
  assert.equal(landingPath("tr"), "/");
  assert.equal(landingPath("en"), "/en");
  assert.equal(landingPath("de"), "/de");
});

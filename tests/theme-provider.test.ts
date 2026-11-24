import assert from "node:assert/strict";
import test from "node:test";
import { isLightOnlyPath } from "../lib/theme/light-only.ts";

test("public pages always use the light theme", () => {
  for (const path of ["/", "/en", "/en/", "/sign-in", "/en/sign-up", "/forgot-password", "/privacy", "/w/abc"]) {
    assert.equal(isLightOnlyPath(path), true, path);
  }
});

test("app pages follow the chosen theme", () => {
  for (const path of ["/dashboard", "/transactions", "/settings", "/wishlists", "/sign-inx"]) {
    assert.equal(isLightOnlyPath(path), false, path);
  }
});

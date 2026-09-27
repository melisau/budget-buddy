import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { authErrorCode, isAuthMode } from "../lib/auth/form.ts";

test("credential form uses native POST even before hydration", () => {
  const source = readFileSync(new URL("../components/auth/auth-page.tsx", import.meta.url), "utf8");
  assert.match(source, /<form method="post" action="\/auth\/submit"/);
  assert.doesNotMatch(source, /preventDefault/);
  assert.match(source, /name="mode"/);
});
test("upstream errors become safe fixed codes, never credential-bearing text", () => {
  assert.equal(authErrorCode({ code: "invalid_credentials" }), "credentials");
  assert.equal(authErrorCode({ code: "email_not_confirmed" }), "unconfirmed");
  assert.equal(authErrorCode({ code: "over_email_send_rate_limit" }), "rate");
  assert.equal(authErrorCode({ code: "email_address_not_authorized" }), "email");
  assert.equal(authErrorCode({ message: "secret-password user@example.test", code: "unknown" }), "failed");
  assert.equal(isAuthMode("sign-up"), true);
  assert.equal(isAuthMode("https://evil.test"), false);
});

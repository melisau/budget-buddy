import assert from "node:assert/strict";
import test from "node:test";
import { createNoncePair, googleIdentityClientId, isTrustedWebActivity, sha256Hex } from "../lib/auth/google-identity.ts";

test("accepts only Google web client IDs", () => {
  assert.equal(googleIdentityClientId(" 123-abc.apps.googleusercontent.com "), "123-abc.apps.googleusercontent.com");
  assert.equal(googleIdentityClientId(""), null);
  assert.equal(googleIdentityClientId(undefined), null);
  assert.equal(googleIdentityClientId("not-a-client-id"), null);
});

test("detects the Android TWA referrer", () => {
  assert.equal(isTrustedWebActivity("android-app://com.melisauyar.budgetbuddy/"), true);
  assert.equal(isTrustedWebActivity("https://budgetbuddy.melisauyar.com/"), false);
  assert.equal(isTrustedWebActivity(""), false);
});

test("hashes the nonce with SHA-256 for Google and keeps the raw value", async () => {
  assert.equal(await sha256Hex("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  const { raw, hashed } = await createNoncePair();
  assert.match(raw, /^[0-9a-f]{64}$/);
  assert.equal(hashed, await sha256Hex(raw));
});

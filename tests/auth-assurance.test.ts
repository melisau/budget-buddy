import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { readFileSync } from "node:fs";
import { accessTokenAssuranceLevel, hasVerifiedFactor, secondStepPending } from "../lib/auth/assurance.ts";
import { authErrorCode } from "../lib/auth/form.ts";

// Unsigned test tokens: only the payload matters to these helpers.
const token = (payload: Record<string, unknown>) =>
  `header.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.signature`;
const verified = [{ status: "verified" }];

describe("two-step verification", () => {
  test("reads the assurance level from the access token", () => {
    assert.equal(accessTokenAssuranceLevel(token({ aal: "aal1" })), "aal1");
    assert.equal(accessTokenAssuranceLevel(token({ aal: "aal2" })), "aal2");
  });

  test("an unreadable or unexpected token has no level", () => {
    for (const value of [null, undefined, "", "not-a-token", "a.%%%.c", token({}), token({ aal: "aal3" }), token({ aal: 2 })]) {
      assert.equal(accessTokenAssuranceLevel(value), null);
    }
  });

  test("only verified factors turn two-step verification on", () => {
    assert.equal(hasVerifiedFactor(null), false);
    assert.equal(hasVerifiedFactor([]), false);
    assert.equal(hasVerifiedFactor([{ status: "unverified" }]), false);
    assert.equal(hasVerifiedFactor([{ status: "unverified" }, { status: "verified" }]), true);
  });

  test("an account without two-step verification is never pending", () => {
    assert.equal(secondStepPending([], token({ aal: "aal1" })), false);
    assert.equal(secondStepPending([{ status: "unverified" }], token({ aal: "aal1" })), false);
    assert.equal(secondStepPending(undefined, null), false);
  });

  test("a password-only session on a two-step account is pending", () => {
    assert.equal(secondStepPending(verified, token({ aal: "aal1" })), true);
  });

  test("a session that passed the second step is not pending", () => {
    assert.equal(secondStepPending(verified, token({ aal: "aal2" })), false);
  });

  test("a two-step account fails closed when the level cannot be read", () => {
    assert.equal(secondStepPending(verified, null), true);
    assert.equal(secondStepPending(verified, "garbage"), true);
    assert.equal(secondStepPending(verified, token({})), true);
  });

  test("the server hides a pending user from every protected page and API route", () => {
    const source = readFileSync(new URL("../lib/auth/supabase-server.ts", import.meta.url), "utf8");
    assert.match(source, /state\.secondStepPending \? null : state\.user/);
    const layout = readFileSync(new URL("../app/(protected)/layout.tsx", import.meta.url), "utf8");
    assert.match(layout, /if \(secondStepPending\) redirect\("\/auth\/two-step"\)/);
  });

  test("a rejected password change on a two-step account maps to a fixed code", () => {
    assert.equal(authErrorCode({ code: "insufficient_aal" }), "twostep");
  });
});

import assert from "node:assert/strict";
import test from "node:test";

process.env.CLERK_SECRET_KEY = "sk_test_unit_only";
const { signAuthIdentity, verifyAuthIdentity } = await import("../lib/auth/auth-header-signature.ts");

test("a signed identity verifies", async () => {
  const header = await signAuthIdentity("user_abc123");
  assert.equal(await verifyAuthIdentity(header), "user_abc123");
});

test("forged or unsigned identities are rejected", async () => {
  assert.equal(await verifyAuthIdentity(null), null);
  assert.equal(await verifyAuthIdentity("user_abc123"), null);
  assert.equal(await verifyAuthIdentity(`user_abc123.${Date.now()}.AAAA`), null);
});

test("a signature cannot be reused for another user", async () => {
  const [, issuedAt, signature] = (await signAuthIdentity("user_victim")).split(".");
  assert.equal(await verifyAuthIdentity(`user_attacker.${issuedAt}.${signature}`), null);
});

test("expired identities are rejected", async () => {
  const header = await signAuthIdentity("user_abc123", Date.now() - 120_000);
  assert.equal(await verifyAuthIdentity(header), null);
});

test("a different secret invalidates the signature", async () => {
  const header = await signAuthIdentity("user_abc123");
  process.env.CLERK_SECRET_KEY = "sk_test_rotated";
  try {
    assert.equal(await verifyAuthIdentity(header), null);
  } finally {
    process.env.CLERK_SECRET_KEY = "sk_test_unit_only";
  }
});

test("malformed user IDs are refused", async () => {
  await assert.rejects(signAuthIdentity("user.with.dots"));
  await assert.rejects(signAuthIdentity("' or 1=1 --"));
});

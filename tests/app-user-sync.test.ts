import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { resetDatabase, rows, rpcCalls } from "./support/fake-supabase.ts";
import { PROFILE_REFRESH_MS, isAppUserFresh, syncAppUser } from "../lib/auth/app-user.ts";

const NOW = Date.parse("2026-10-18T12:00:00Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();
const identity = { clerkUserId: "clerk_ada", displayName: "Ada", email: "ada@example.com", imageUrl: null };

beforeEach(() => resetDatabase());

test("a new user is not fresh, so the layout syncs from Clerk", async () => {
  assert.equal(await isAppUserFresh("clerk_ada", NOW), false);
});

test("a recently synced, seeded user is fresh: no Clerk call needed", async () => {
  resetDatabase({ users: [{ id: "u1", clerk_user_id: "clerk_ada", updated_at: ago(60_000), starter_data_seeded_at: ago(60_000) }] });
  assert.equal(await isAppUserFresh("clerk_ada", NOW), true);
});

test("a profile older than the refresh window is refreshed", async () => {
  resetDatabase({ users: [{ id: "u1", clerk_user_id: "clerk_ada", updated_at: ago(PROFILE_REFRESH_MS + 1), starter_data_seeded_at: ago(PROFILE_REFRESH_MS + 1) }] });
  assert.equal(await isAppUserFresh("clerk_ada", NOW), false);
});

test("a user without starter data is never treated as fresh", async () => {
  resetDatabase({ users: [{ id: "u1", clerk_user_id: "clerk_ada", updated_at: ago(1_000), starter_data_seeded_at: null }] });
  assert.equal(await isAppUserFresh("clerk_ada", NOW), false);
});

test("syncing a new user creates the row and seeds starter data once", async () => {
  await syncAppUser(identity);
  assert.equal(rows("users").length, 1);
  assert.deepEqual(rpcCalls.map((call) => call.name), ["seed_user_starter_data"]);
});

test("syncing an already seeded user updates the profile without the seeding call", async () => {
  resetDatabase({ users: [{ id: "u1", clerk_user_id: "clerk_ada", name: "Old name", starter_data_seeded_at: ago(1_000) }] });
  await syncAppUser(identity);
  assert.equal(rows("users").length, 1);
  assert.equal(rows("users")[0].name, "Ada");
  assert.equal(rpcCalls.length, 0);
});

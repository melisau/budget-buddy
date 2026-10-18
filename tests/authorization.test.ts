import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { resetDatabase, rows } from "./support/fake-supabase.ts";
import { setSignedInAuthUser } from "./support/fake-auth.ts";
import {
  AccessError,
  getAcceptedFamilyRole,
  requireAppUser,
  requireFamilyWriteAccess,
  requireTransactionReadAccess,
  requireTransactionWriteAccess,
  type AppUser,
} from "../lib/auth/authorization.ts";
import { createTransaction, listTransactionData, type TransactionPayload } from "../lib/finance/transaction-data.ts";

// Cast of characters
//   alice: owner of the "home" family group
//   bob:   accepted member of "home"
//   dave:  accepted viewer of "home" (read-only)
//   erin:  invited to "home" but has not accepted
//   mallory: unrelated user
const user = (id: string): AppUser => ({ id, authUserId: `auth-${id}`, email: `${id}@example.com`, name: id });
const alice = user("alice");
const bob = user("bob");
const dave = user("dave");
const erin = user("erin");
const mallory = user("mallory");

function seed() {
  resetDatabase({
    users: [alice, bob, dave, erin, mallory].map((u) => ({ id: u.id, auth_user_id: u.authUserId, email: u.email, name: u.name })),
    family_groups: [{ id: "home", owner_user_id: "alice", name: "Home" }],
    family_members: [
      { id: "m1", family_group_id: "home", user_id: "alice", role: "owner", invitation_status: "accepted" },
      { id: "m2", family_group_id: "home", user_id: "bob", role: "member", invitation_status: "accepted" },
      { id: "m3", family_group_id: "home", user_id: "dave", role: "viewer", invitation_status: "accepted" },
      { id: "m4", family_group_id: "home", user_id: "erin", role: "member", invitation_status: "pending" },
    ],
    accounts: [
      { id: "acc-alice", user_id: "alice", name: "Alice bank", archived_at: null },
      { id: "acc-bob", user_id: "bob", name: "Bob bank", archived_at: null },
      { id: "acc-dave", user_id: "dave", name: "Dave cash", archived_at: null },
      { id: "acc-mallory", user_id: "mallory", name: "Mallory bank", archived_at: null },
    ],
    categories: [
      { id: "cat-alice-exp", user_id: "alice", name: "Groceries", type: "expense" },
      { id: "cat-alice-inc", user_id: "alice", name: "Salary", type: "income" },
      { id: "cat-bob-exp", user_id: "bob", name: "Groceries", type: "expense" },
      { id: "cat-dave-exp", user_id: "dave", name: "Groceries", type: "expense" },
      { id: "cat-mallory-exp", user_id: "mallory", name: "Groceries", type: "expense" },
    ],
    transactions: [
      { id: "t-alice", user_id: "alice", owner_user_id: "alice", family_group_id: null, title: "Alice private", transaction_date: "2026-10-01" },
      { id: "t-bob", user_id: "bob", owner_user_id: "bob", family_group_id: null, title: "Bob private", transaction_date: "2026-10-02" },
      { id: "f-alice", user_id: "alice", owner_user_id: "alice", family_group_id: "home", title: "Alice family", transaction_date: "2026-10-03" },
      { id: "f-bob", user_id: "bob", owner_user_id: "bob", family_group_id: "home", title: "Bob family", transaction_date: "2026-10-04" },
      { id: "f-dave", user_id: "dave", owner_user_id: "dave", family_group_id: "home", title: "Dave family", transaction_date: "2026-10-05" },
    ],
  });
}

async function rejectsWith(promise: Promise<unknown>, status: number) {
  await assert.rejects(promise, (error: unknown) => {
    assert.ok(error instanceof AccessError, `expected AccessError, got ${String(error)}`);
    assert.equal(error.status, status);
    return true;
  });
}

const payload = (overrides: Partial<TransactionPayload> = {}): TransactionPayload => ({
  type: "expense",
  amount: 10,
  title: "Coffee",
  categoryId: "cat-alice-exp",
  accountId: "acc-alice",
  date: "2026-10-10",
  ...overrides,
});

beforeEach(() => {
  seed();
  setSignedInAuthUser(null);
});

describe("sign-in", () => {
  test("signed-out requests are rejected with 401", async () => {
    await rejectsWith(requireAppUser(), 401);
  });

  test("the verified Supabase Auth user maps to their own app user", async () => {
    setSignedInAuthUser("auth-bob");
    const appUser = await requireAppUser();
    assert.equal(appUser.id, "bob");
  });
});

describe("personal transactions", () => {
  test("the owner can change and view their own transaction", async () => {
    await requireTransactionWriteAccess("alice", "t-alice");
    await requireTransactionReadAccess("alice", "t-alice");
  });

  test("another user cannot change or view it, even a family member", async () => {
    await rejectsWith(requireTransactionWriteAccess("bob", "t-alice"), 403);
    await rejectsWith(requireTransactionReadAccess("bob", "t-alice"), 403);
    await rejectsWith(requireTransactionWriteAccess("mallory", "t-alice"), 403);
    await rejectsWith(requireTransactionReadAccess("mallory", "t-alice"), 403);
  });

  test("an unknown transaction ID returns 404", async () => {
    await rejectsWith(requireTransactionWriteAccess("alice", "does-not-exist"), 404);
    await rejectsWith(requireTransactionReadAccess("alice", "does-not-exist"), 404);
  });
});

describe("family roles", () => {
  test("roles resolve only for accepted members", async () => {
    assert.equal(await getAcceptedFamilyRole("alice", "home"), "owner");
    assert.equal(await getAcceptedFamilyRole("bob", "home"), "member");
    assert.equal(await getAcceptedFamilyRole("dave", "home"), "viewer");
    assert.equal(await getAcceptedFamilyRole("erin", "home"), null);
    assert.equal(await getAcceptedFamilyRole("mallory", "home"), null);
  });

  test("owners and members may write; viewers, pending invitees and outsiders may not", async () => {
    await requireFamilyWriteAccess("alice", "home");
    await requireFamilyWriteAccess("bob", "home");
    await rejectsWith(requireFamilyWriteAccess("dave", "home"), 403);
    await rejectsWith(requireFamilyWriteAccess("erin", "home"), 403);
    await rejectsWith(requireFamilyWriteAccess("mallory", "home"), 403);
  });

  test("a member can change only family transactions in their own name", async () => {
    await requireTransactionWriteAccess("bob", "f-bob");
    await rejectsWith(requireTransactionWriteAccess("bob", "f-alice"), 403);
    await rejectsWith(requireTransactionWriteAccess("alice", "f-bob"), 403);
  });

  test("a viewer cannot change family transactions, not even their own", async () => {
    await rejectsWith(requireTransactionWriteAccess("dave", "f-dave"), 403);
    await rejectsWith(requireTransactionWriteAccess("dave", "f-alice"), 403);
  });

  test("every accepted member, including viewers, can view family transactions", async () => {
    for (const member of ["alice", "bob", "dave"]) await requireTransactionReadAccess(member, "f-alice");
  });

  test("pending invitees and outsiders cannot view family transactions", async () => {
    await rejectsWith(requireTransactionReadAccess("erin", "f-alice"), 403);
    await rejectsWith(requireTransactionReadAccess("mallory", "f-alice"), 403);
  });

  test("a removed member loses access immediately", async () => {
    const membership = rows("family_members").find((row) => row.user_id === "bob");
    assert.ok(membership);
    membership.invitation_status = "removed";
    await rejectsWith(requireTransactionWriteAccess("bob", "f-bob"), 403);
    await rejectsWith(requireTransactionReadAccess("bob", "f-alice"), 403);
  });
});

describe("creating transactions", () => {
  test("uses another user's account or category → rejected, nothing saved", async () => {
    const before = rows("transactions").length;
    await assert.rejects(createTransaction(mallory, payload({ accountId: "acc-alice", categoryId: "cat-mallory-exp" })));
    await assert.rejects(createTransaction(mallory, payload({ accountId: "acc-mallory", categoryId: "cat-alice-exp" })));
    assert.equal(rows("transactions").length, before);
  });

  test("a category of the wrong type is rejected", async () => {
    await assert.rejects(createTransaction(alice, payload({ type: "expense", categoryId: "cat-alice-inc" })));
  });

  test("ownership comes from the signed-in user, never from the request", async () => {
    const created = await createTransaction(bob, payload({ accountId: "acc-bob", categoryId: "cat-bob-exp" })) as Record<string, unknown>;
    assert.equal(created.user_id, "bob");
    assert.equal(created.owner_user_id, "bob");
    assert.equal(created.created_by_user_id, "bob");
    assert.equal(created.family_group_id, null);
  });

  test("a member can add a family transaction; a viewer and an outsider cannot", async () => {
    const created = await createTransaction(bob, payload({ accountId: "acc-bob", categoryId: "cat-bob-exp", familyGroupId: "home" })) as Record<string, unknown>;
    assert.equal(created.family_group_id, "home");
    assert.equal(created.owner_user_id, "bob");

    const before = rows("transactions").length;
    await rejectsWith(createTransaction(dave, payload({ accountId: "acc-dave", categoryId: "cat-dave-exp", familyGroupId: "home" })), 403);
    await rejectsWith(createTransaction(mallory, payload({ accountId: "acc-mallory", categoryId: "cat-mallory-exp", familyGroupId: "home" })), 403);
    assert.equal(rows("transactions").length, before);
  });
});

describe("listing transactions", () => {
  const ids = async (who: AppUser) => (await listTransactionData(who)).transactions.map((row) => (row as { id: string }).id).sort();

  test("a user sees their own and their families' transactions, never another user's private ones", async () => {
    assert.deepEqual(await ids(bob), ["f-alice", "f-bob", "f-dave", "t-bob"]);
    assert.deepEqual(await ids(alice), ["f-alice", "f-bob", "f-dave", "t-alice"]);
  });

  test("a pending invitee and an outsider see no family data", async () => {
    assert.deepEqual(await ids(erin), []);
    assert.deepEqual(await ids(mallory), []);
  });

  test("accounts and categories in the response belong to the user only", async () => {
    const data = await listTransactionData(bob);
    assert.deepEqual(data.accounts.map((row) => (row as { id: string }).id), ["acc-bob"]);
    assert.ok(data.categories.every((row) => (row as { user_id?: string }).user_id === "bob"));
  });
});

import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { resetDatabase, rows, avatarStorage, avatarStorageCalls, setAvatarWriteFailure } from "./support/fake-supabase.ts";
import { setSignedInAuthUser } from "./support/fake-auth.ts";
import { isAvatarIcon, ownedAvatarPath, validateAvatarFile } from "../lib/profile/avatar.ts";
import { readOwnAvatar, resolveAvatars, saveOwnAvatar } from "../lib/profile/avatar-server.ts";
import { PATCH, POST } from "../app/api/account/avatar/route.ts";
import { listFamilyGroups } from "../lib/finance/family-data.ts";

const image = () => new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0])], "photo.png", { type: "image/png" });
const id = "10000000-0000-4000-8000-000000000001";
const other = "10000000-0000-4000-8000-000000000002";
const filename = "20000000-0000-4000-8000-000000000001.png";

beforeEach(() => {
  resetDatabase({ users: [{ id, auth_user_id: "auth-owner", name: "Owner", avatar_icon: "initials", avatar_path: null }, { id: other, auth_user_id: "auth-other", name: "Other", avatar_icon: "sun", avatar_path: null }] });
  setSignedInAuthUser("auth-owner");
});

test("avatar file validation rejects SVG, forged MIME, empty and oversized uploads", async () => {
  await validateAvatarFile(image());
  for (const file of [new File(["<svg/>"], "test.svg", { type: "image/svg+xml" }), new File(["<svg/>"], "test.png", { type: "image/png" }), new File([], "empty.png", { type: "image/png" }), new File([new Uint8Array(2 * 1024 * 1024 + 1)], "large.png", { type: "image/png" })]) await assert.rejects(validateAvatarFile(file));
  assert.equal(isAvatarIcon("cat"), true);
  assert.equal(isAvatarIcon("https://example.test/avatar.png"), false);
});

test("only an owner's generated avatar path can be signed or deleted", async () => {
  assert(ownedAvatarPath(id, `${id}/${filename}`));
  for (const path of [`${other}/${filename}`, `${id}/../${other}/${filename}`, `https://example.test/${id}/${filename}`, `${id}/anything.svg`]) assert.equal(ownedAvatarPath(id, path), false);
  const avatars = await resolveAvatars([{ id, avatar_icon: "cat", avatar_path: `${other}/${filename}` }]);
  assert.deepEqual(avatars.get(id), { icon: "cat", url: null });
  assert.equal(avatarStorageCalls.length, 0);
});

test("photo replacement uses a unique owned path; switching to an icon removes the old photo", async () => {
  const uploaded = await saveOwnAvatar(id, image());
  assert(uploaded.url);
  assert.equal(avatarStorage.size, 1);
  const path = String(rows("users")[0].avatar_path);
  assert(ownedAvatarPath(id, path));
  assert.equal(rows("users")[1].avatar_icon, "sun");
  await saveOwnAvatar(id, "flower");
  assert.equal(avatarStorage.size, 0);
  assert.deepEqual((await readOwnAvatar(id)).avatar, { icon: "flower", url: null });
});

test("failed avatar save removes the new upload and preserves the previous profile", async () => {
  setAvatarWriteFailure(true);
  await assert.rejects(saveOwnAvatar(id, image()));
  assert.equal(avatarStorage.size, 0);
  assert.equal(rows("users")[0].avatar_path, null);
});

test("avatar API ignores client user IDs and rejects signed-out and cross-origin writes", async () => {
  const request = (origin: string) => new Request("https://app.example.test/api/account/avatar", { method: "PATCH", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify({ icon: "cat", userId: other }) });
  assert.equal((await PATCH(request("https://app.example.test"))).status, 200);
  assert.equal(rows("users")[0].avatar_icon, "cat");
  assert.equal(rows("users")[1].avatar_icon, "sun");
  assert.equal((await PATCH(request("https://evil.example.test"))).status, 403);
  setSignedInAuthUser(null);
  assert.equal((await PATCH(request("https://app.example.test"))).status, 401);
  const form = new FormData(); form.set("file", image());
  assert.equal((await POST(new Request("https://app.example.test/api/account/avatar", { method: "POST", headers: { Origin: "https://app.example.test" }, body: form }))).status, 401);
});

test("family avatars are available only through accepted membership; pending profiles are not exposed", async () => {
  rows("family_groups").push({ id: "home", name: "Home", owner_user_id: id });
  rows("family_members").push({ id: "m1", family_group_id: "home", user_id: id, role: "owner", invitation_status: "accepted" }, { id: "m2", family_group_id: "home", user_id: other, role: "member", invitation_status: "pending" });
  const user = { id, authUserId: "auth-owner", email: null, name: "Owner" };
  const groups = await listFamilyGroups(user);
  assert.deepEqual(groups[0].members[0].avatar, { icon: "initials", url: null });
  assert.equal(groups[0].members[1].avatar, null);
  assert.deepEqual(await listFamilyGroups({ ...user, id: other }), []);
});

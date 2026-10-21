import { getSupabaseServerClient } from "@/lib/supabase/server";
import { avatarMaxBytes, isAvatarIcon, ownedAvatarPath, validateAvatarFile, type ProfileAvatarData, type AvatarIcon } from "@/lib/profile/avatar";

const bucket = "budgetbuddy-avatars";
type Profile = { id: string; avatar_icon?: string | null; avatar_path?: string | null };

export async function resolveAvatars(profiles: Profile[]): Promise<Map<string, ProfileAvatarData>> {
  const result = new Map(profiles.map((profile) => [profile.id, { icon: isAvatarIcon(profile.avatar_icon) ? profile.avatar_icon : "initials", url: null } as ProfileAvatarData]));
  const paths = profiles.flatMap((profile) => ownedAvatarPath(profile.id, profile.avatar_path) ? [profile.avatar_path] : []);
  if (!paths.length) return result;
  // A storage outage should not prevent family access: icons remain available.
  try {
    const { data, error } = await getSupabaseServerClient().storage.from(bucket).createSignedUrls(paths, 3600);
    if (!error) for (const profile of profiles) {
      const signed = data?.find((item) => item.path === profile.avatar_path && item.signedUrl && !item.error);
      if (signed) result.get(profile.id)!.url = signed.signedUrl;
    }
  } catch {
    console.error("[avatar] image URLs unavailable");
  }
  return result;
}

export async function readOwnAvatar(userId: string) {
  const { data, error } = await getSupabaseServerClient().from("users").select("id, avatar_icon, avatar_path").eq("id", userId).single();
  if (error) throw new Error("Unable to load profile picture.");
  return { profile: data as Profile, avatar: (await resolveAvatars([data as Profile])).get(userId)! };
}

async function ensureAvatarBucket() {
  const storage = getSupabaseServerClient().storage;
  const { data, error } = await storage.getBucket(bucket);
  if (data) {
    if (data.public) throw new Error("Avatar storage must be private.");
    return;
  }
  if (error && !(error.statusCode === "404" || /not found/i.test(error.message))) throw new Error("Unable to access avatar storage.");
  const { error: createError } = await storage.createBucket(bucket, { public: false, fileSizeLimit: avatarMaxBytes, allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"] });
  if (createError && !/already exists/i.test(createError.message)) throw new Error("Unable to create avatar storage.");
}

export async function deleteAvatarFiles(userId: string, paths: string[]) {
  const safePaths = paths.filter((path) => ownedAvatarPath(userId, path));
  if (!safePaths.length) return;
  const { error } = await getSupabaseServerClient().storage.from(bucket).remove(safePaths);
  if (error) throw new Error("Unable to remove old profile picture.");
}

export async function saveOwnAvatar(userId: string, selection: AvatarIcon | File): Promise<ProfileAvatarData> {
  const { profile } = await readOwnAvatar(userId);
  const supabase = getSupabaseServerClient();
  let newPath: string | null = null;
  const icon = typeof selection === "string" ? selection : "initials";
  if (typeof selection !== "string") {
    await validateAvatarFile(selection);
    await ensureAvatarBucket();
    const ext = selection.type === "image/png" ? "png" : selection.type === "image/webp" ? "webp" : "jpg";
    newPath = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(newPath, await selection.arrayBuffer(), { contentType: selection.type, upsert: false, cacheControl: "3600" });
    if (error) throw new Error("Unable to upload profile picture.");
  }
  let update = supabase.from("users").update({ avatar_icon: icon, avatar_path: newPath }).eq("id", userId);
  update = profile.avatar_path ? update.eq("avatar_path", profile.avatar_path) : update.is("avatar_path", null);
  const { data: saved, error } = await update.select("id").maybeSingle();
  if (error || !saved) {
    if (newPath) await deleteAvatarFiles(userId, [newPath]);
    throw new Error("Unable to save profile picture.");
  }
  if (profile.avatar_path) {
    try { await deleteAvatarFiles(userId, [profile.avatar_path]); } catch { console.error("[avatar] old image cleanup failed"); }
  }
  return (await resolveAvatars([{ id: userId, avatar_icon: icon, avatar_path: newPath }])).get(userId)!;
}

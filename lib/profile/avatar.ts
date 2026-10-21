export const avatarIcons = ["initials", "cat", "dog", "flower", "sun", "mountain"] as const;
export type AvatarIcon = typeof avatarIcons[number];
export type ProfileAvatarData = { icon: AvatarIcon; url: string | null };
export function isAvatarIcon(value: unknown): value is AvatarIcon {
  return typeof value === "string" && avatarIcons.includes(value as AvatarIcon);
}
export const avatarMaxBytes = 2 * 1024 * 1024;

export function ownedAvatarPath(userId: string, path: unknown): path is string {
  if (typeof path !== "string" || !path.startsWith(`${userId}/`)) return false;
  return /^[0-9a-f-]{36}\.(png|jpg|webp)$/.test(path.slice(userId.length + 1));
}

export async function validateAvatarFile(file: File) {
  if (!file.size || file.size > avatarMaxBytes) throw new Error("Choose an image up to 2 MB.");
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const png = file.type === "image/png" && [137, 80, 78, 71, 13, 10, 26, 10].every((byte, i) => bytes[i] === byte);
  const jpg = file.type === "image/jpeg" && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp = file.type === "image/webp" && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if (!png && !jpg && !webp) throw new Error("Choose a valid JPG, PNG or WebP image.");
}

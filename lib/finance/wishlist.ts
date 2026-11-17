export const occasions = ["birthday", "housewarming", "new_year", "other"] as const;
export type Occasion = typeof occasions[number];

export function safeProductUrl(value: unknown): string | null | undefined {
  if (value === "" || value === null || value === undefined) return null;
  if (typeof value !== "string" || value.length > 500) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined;
  } catch { return undefined; }
}

// Share tokens are 24 random bytes encoded as base64url (32 characters).
const SHARE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32}$/;
export function isShareToken(value: unknown): value is string {
  return typeof value === "string" && SHARE_TOKEN_PATTERN.test(value);
}

// Read-only link viewers see wishes only: never who reserved what.
export function publicWishlistItem(item: { id: string; name: string; note: string; product_url: string | null }) {
  return { id: item.id, name: item.name, note: item.note, productUrl: safeProductUrl(item.product_url) ?? null };
}

export function visibleWishlistItem(item: { id: string; name: string; note: string; product_url: string | null; reserved_by_user_id: string | null }, ownerId: string, viewerId: string, surprise: boolean) {
  return {
    id: item.id, name: item.name, note: item.note, productUrl: item.product_url,
    reserved: ownerId === viewerId && surprise ? null : Boolean(item.reserved_by_user_id),
    reservedByMe: ownerId === viewerId ? false : item.reserved_by_user_id === viewerId,
  };
}

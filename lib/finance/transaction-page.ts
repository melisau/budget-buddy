import { z } from "zod";

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;

export type PageCursor = { date: string; createdAt: string; id: string };

const cursorSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  createdAt: z.string().datetime({ offset: true }),
  id: z.string().uuid(),
}).strict();

/** An opaque cursor: the sort key of the last transaction on the previous page. */
export function encodeCursor(cursor: PageCursor) {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

export function decodeCursor(value: string): PageCursor | null {
  if (value.length > 300) return null;
  try {
    const parsed = cursorSchema.safeParse(JSON.parse(Buffer.from(value, "base64url").toString("utf8")));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export type PageQuery = { limit: number; cursor: PageCursor | null; query: string | null };

/** Returns null when the request does not ask for paging, or "invalid" for bad input. */
export function readPageQuery(params: URLSearchParams): PageQuery | "invalid" | null {
  if (!params.has("limit")) return null;
  const limit = Number(params.get("limit"));
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) return "invalid";
  const rawCursor = params.get("cursor");
  const cursor = rawCursor ? decodeCursor(rawCursor) : null;
  if (rawCursor && !cursor) return "invalid";
  const query = params.get("q")?.trim() ?? "";
  if (query.length > 100) return "invalid";
  return { limit, cursor, query: query || null };
}

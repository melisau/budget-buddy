// PostgREST returns at most `max_rows` (1000) rows per request and says nothing
// when it cuts a result. Any query whose result feeds a total must page.
export const PAGE_SIZE = 1000;

type PageableQuery = { range(from: number, to: number): PromiseLike<{ data: unknown; error: unknown }> };
type OrderableQuery = { order(column: string): PageableQuery };

/**
 * Reads every row of a query. `build` must return a fresh query on each call.
 * `id` is added as the last sort key so rows cannot move between pages.
 */
export async function fetchAllRows<Row>(build: () => OrderableQuery): Promise<{ data: Row[]; error: unknown }> {
  const rows: Row[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await build().order("id").range(from, from + PAGE_SIZE - 1);
    if (error) return { data: [], error };
    const page = (data ?? []) as Row[];
    for (const row of page) rows.push(row);
    if (page.length < PAGE_SIZE) return { data: rows, error: null };
  }
}

/** Makes a value match literally in `ilike`, where `%` and `_` are wildcards. */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

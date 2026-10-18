// Minimal in-memory implementation of the parts of the Supabase query builder
// the app uses. Column projections and joins are ignored: rows come back whole.

type Row = Record<string, unknown>;
type Result = { data: unknown; error: { message: string } | null; count?: number | null };

const tables = new Map<string, Row[]>();
let idCounter = 0;
export const rpcCalls: { name: string; args: unknown }[] = [];

export function resetDatabase(seed: Record<string, Row[]> = {}) {
  tables.clear();
  idCounter = 0;
  rpcCalls.length = 0;
  for (const [name, rows] of Object.entries(seed)) tables.set(name, rows.map((row) => ({ ...row })));
}

export function rows(table: string): Row[] {
  if (!tables.has(table)) tables.set(table, []);
  return tables.get(table)!;
}

type Filter = (row: Row) => boolean;

class Query implements PromiseLike<Result> {
  private filters: Filter[] = [];
  private mode: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  private payload: Row[] = [];
  private patch: Row = {};
  private limitCount: number | null = null;
  private returning = false;
  private singleMode: "single" | "maybe" | null = null;

  constructor(private readonly table: string) {}

  select() { if (this.mode !== "select") this.returning = true; return this; }
  insert(value: Row | Row[]) { this.mode = "insert"; this.payload = Array.isArray(value) ? value : [value]; return this; }
  private conflictColumn: string | null = null;
  upsert(value: Row | Row[], options?: { onConflict?: string }) {
    this.mode = "upsert";
    this.payload = Array.isArray(value) ? value : [value];
    this.conflictColumn = options?.onConflict && !options.onConflict.includes(",") ? options.onConflict : null;
    return this;
  }
  update(value: Row) { this.mode = "update"; this.patch = value; return this; }
  delete() { this.mode = "delete"; return this; }
  eq(column: string, value: unknown) { this.filters.push((row) => row[column] === value); return this; }
  neq(column: string, value: unknown) { this.filters.push((row) => row[column] !== value); return this; }
  in(column: string, values: unknown[]) { this.filters.push((row) => values.includes(row[column])); return this; }
  is(column: string, value: unknown) { this.filters.push((row) => (row[column] ?? null) === value); return this; }
  not(column: string, operator: string, value: unknown) {
    if (operator === "is") this.filters.push((row) => (row[column] ?? null) !== value);
    else this.filters.push((row) => row[column] !== value);
    return this;
  }
  order() { return this; }
  limit(count: number) { this.limitCount = count; return this; }
  single() { this.singleMode = "single"; return this; }
  maybeSingle() { this.singleMode = "maybe"; return this; }

  private matching(): Row[] {
    return rows(this.table).filter((row) => this.filters.every((filter) => filter(row)));
  }

  private execute(): Result {
    let result: Row[];
    if (this.mode === "insert" || this.mode === "upsert") {
      result = this.payload.map((value) => {
        const key = this.conflictColumn;
        const existing = key ? rows(this.table).find((row) => row[key] === value[key]) : undefined;
        if (this.mode === "upsert" && existing) return Object.assign(existing, value);
        const row = { id: value.id ?? `${this.table}-${++idCounter}`, ...value };
        rows(this.table).push(row);
        return row;
      });
    } else if (this.mode === "update") {
      result = this.matching();
      for (const row of result) Object.assign(row, this.patch);
    } else if (this.mode === "delete") {
      result = this.matching();
      tables.set(this.table, rows(this.table).filter((row) => !result.includes(row)));
    } else {
      result = this.matching();
    }
    if (this.limitCount !== null) result = result.slice(0, this.limitCount);

    if (this.singleMode) {
      if (result.length > 1) return { data: null, error: { message: "multiple rows returned" } };
      if (result.length === 0) {
        return this.singleMode === "maybe" ? { data: null, error: null } : { data: null, error: { message: "no rows returned" } };
      }
      return { data: { ...result[0] }, error: null };
    }
    if (this.mode !== "select" && !this.returning) return { data: null, error: null };
    return { data: result.map((row) => ({ ...row })), error: null, count: result.length };
  }

  then<T1 = Result, T2 = never>(resolve?: ((value: Result) => T1 | PromiseLike<T1>) | null, reject?: ((reason: unknown) => T2 | PromiseLike<T2>) | null) {
    return Promise.resolve().then(() => this.execute()).then(resolve, reject);
  }
}

const client = {
  from: (table: string) => new Query(table),
  rpc: async (name: string, args: unknown) => {
    rpcCalls.push({ name, args });
    return { data: true, error: null };
  },
  storage: { from: () => ({ remove: async () => ({ error: null }) }) },
};

export function isSupabaseConfigured() {
  return true;
}

export function getSupabaseServerClient() {
  return client;
}

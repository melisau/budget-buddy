/**
 * The billing migrations (0005/0006) are not applied in every environment.
 * A query that touches their columns or tables then fails with one of these
 * codes, which means "this database has no billing state", not a real outage.
 *
 * 42703: PostgreSQL undefined_column
 * 42P01: PostgreSQL undefined_table
 * PGRST204 / PGRST205: PostgREST cannot find the column / table in its schema cache
 */
const missingSchemaCodes = new Set(["42703", "42P01", "PGRST204", "PGRST205"]);

export function isMissingBillingSchemaError(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("code" in error)) return false;
  return missingSchemaCodes.has(String(error.code));
}

type RpcResult = { data: unknown; error: { code?: string; message?: string } | null };

/** The default account's ID, or null while migration 0025 has not reached this database. */
export function defaultAccountFromRpc({ data, error }: RpcResult): string | null {
  if (error?.code === "PGRST202") return null;
  if (error) throw new Error(`Unable to prepare the default account: ${error.message ?? "unknown error"}`);
  return typeof data === "string" ? data : null;
}

export function authDestination(value: unknown): "/dashboard" | "/family" | "/update-password" {
  return value === "/family" || value === "/update-password" ? value : "/dashboard";
}

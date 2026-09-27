export const CLERK_SESSION_COOKIE = "budget_buddy_session";

export function setClerkSessionCookie(token: string): void {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CLERK_SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=55; SameSite=Lax${secure}`;
}

export function clearClerkSessionCookie(): void {
  document.cookie = `${CLERK_SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

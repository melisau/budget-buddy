import assert from "node:assert/strict";
import test from "node:test";
import { createServerClient } from "@supabase/ssr";

test("SSR login, verified identity, refresh and signout propagate isolated cookies", async () => {
  const jar = new Map<string, string>();
  const user = { id: "20000000-0000-4000-8000-000000000099", aud: "authenticated", role: "authenticated", email: "test@example.test", email_confirmed_at: "2026-01-01T00:00:00Z", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" };
  const issued = new Set<string>();
  let userRequests = 0;
  let refreshRequests = 0;
  function session() {
    const now = Math.floor(Date.now() / 1000);
    const access_token = [Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url"), Buffer.from(JSON.stringify({ sub: user.id, aud: "authenticated", exp: now + 3600, iat: now })).toString("base64url"), "test-signature"].join(".");
    issued.add(access_token);
    return { access_token, refresh_token: "test-refresh-token", token_type: "bearer", expires_in: 3600, user };
  }
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input);
    if (url.includes("/token?grant_type=password")) return Response.json(session());
    if (url.includes("/token?grant_type=refresh_token")) { refreshRequests++; return Response.json(session()); }
    if (url.endsWith("/user")) {
      userRequests++;
      const token = new Headers(init?.headers).get("authorization")?.replace("Bearer ", "");
      return token && issued.has(token) ? Response.json(user) : Response.json({ message: "Invalid token" }, { status: 401 });
    }
    if (url.includes("/logout")) return new Response(null, { status: 204 });
    throw new Error(`Unexpected network request: ${url}`);
  };
  const create = (cookies = jar) => createServerClient("http://127.0.0.1:54321", "test-public-key", {
    global: { fetch: fetcher },
    cookies: {
      getAll: () => Array.from(cookies, ([name, value]) => ({ name, value })),
      setAll(values) { values.forEach(({ name, value, options }) => { if (options.maxAge === 0) cookies.delete(name); else cookies.set(name, value); }); },
    },
  });
  const login = await create().auth.signInWithPassword({ email: user.email, password: "test-only-password" });
  assert.equal(login.error, null);
  assert.ok(jar.size > 0, "login writes SSR cookies");
  const request = create();
  assert.equal((await request.auth.getUser()).data.user?.id, user.id);
  assert.ok(userRequests > 0, "server verifies identity via Auth, not cookie contents");
  assert.equal((await create(new Map()).auth.getUser()).data.user, null, "another request has no inherited session");
  assert.equal((await request.auth.refreshSession()).error, null);
  assert.equal(refreshRequests, 1);
  assert.equal((await create().auth.getUser()).data.user?.id, user.id, "refreshed session survives another request");
  issued.clear();
  assert.equal((await create().auth.getUser()).data.user, null, "revoked/forged token cannot authenticate");
  await request.auth.signOut({ scope: "local" });
  assert.equal(jar.size, 0);
  assert.equal((await create().auth.getUser()).data.user, null);
});

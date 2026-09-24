import { NextResponse } from "next/server";
import { createSupabaseAuthClient } from "@/lib/supabase/auth-server";
import { authDestination } from "@/lib/auth/redirect";
import { authErrorCode, isAuthMode, type AuthMode } from "@/lib/auth/form";

// Native POST works before hydration and when JavaScript is disabled.
// Never reflect form fields, credentials or upstream errors into URLs or logs.
export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  const respond = (path: string) => {
    const response = NextResponse.redirect(new URL(path, origin), 303);
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  };
  if (request.headers.get("origin") !== origin) return new NextResponse("Forbidden", { status: 403 });
  let mode: AuthMode = "sign-in";
  let next = "/dashboard";
  const failure = (code: string) => respond(`/${mode}?error=${code}&redirect=${encodeURIComponent(next)}`);
  try {
    const form = await request.formData();
    const submittedMode = form.get("mode");
    if (!isAuthMode(submittedMode)) return failure("invalid");
    mode = submittedMode;
    next = authDestination(form.get("redirect"));
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    if (mode !== "update-password" && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)) return failure("invalid");
    if (mode !== "forgot-password" && (password.length < (mode === "sign-in" ? 1 : 8) || password.length > 128)) return failure("invalid");
    const client = await createSupabaseAuthClient();
    if (mode === "sign-up") {
      const { data, error } = await client.auth.signUp({ email, password, options: {
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
        data: { full_name: String(form.get("name") ?? "").trim().slice(0, 100) },
      } });
      if (error) return failure(authErrorCode(error));
      return respond(data.session ? next : "/sign-up?status=confirmation");
    }
    if (mode === "sign-in") {
      const { error } = await client.auth.signInWithPassword({ email, password });
      return error ? failure(authErrorCode(error)) : respond(next);
    }
    if (mode === "forgot-password") {
      const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/callback?next=/update-password` });
      return error ? failure(authErrorCode(error)) : respond("/forgot-password?status=recovery");
    }
    const { data, error: userError } = await client.auth.getUser();
    if (userError || !data.user?.email_confirmed_at) return respond("/sign-in?error=session");
    const { error } = await client.auth.updateUser({ password });
    return error ? failure(authErrorCode(error)) : respond("/dashboard");
  } catch {
    return failure("failed");
  }
}

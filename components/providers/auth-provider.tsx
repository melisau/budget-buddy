"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const AuthContext = createContext<{ user: User | null; loading: boolean }>({ user: null, loading: true });
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ user: User | null; loading: boolean }>({ user: null, loading: true });
  useEffect(() => {
    // Public landing page still renders when development auth is not configured.
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return;
    const client = getSupabaseBrowserClient();
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      setState({ user: session?.user ?? null, loading: false });
    });
    return () => data.subscription.unsubscribe();
  }, []);
  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuthUser() { return useContext(AuthContext); }

export async function signOut() {
  const { error } = await getSupabaseBrowserClient().auth.signOut();
  if (error) throw error;
  // Drop all cached authenticated React payloads on logout.
  window.location.replace("/sign-in");
}

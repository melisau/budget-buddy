"use client";

import { useContext, useEffect } from "react";
import { useAuthUser } from "@/components/providers/auth-provider";
import { LanguageContext } from "@/components/providers/language-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Keeps the signed-in user's Auth metadata `language` in step with the
 * language chosen in the app, so Supabase sends verification, password-reset
 * and email-change messages in that language (templates branch on
 * `.Data.language`). Only writes when the value actually differs.
 */
export function AuthLanguageSync() {
  const { user } = useAuthUser();
  const { language } = useContext(LanguageContext);
  const stored = user?.user_metadata?.language;

  useEffect(() => {
    if (!user || stored === language) return;
    void getSupabaseBrowserClient().auth.updateUser({ data: { language } }).catch(() => undefined);
  }, [user, stored, language]);

  return null;
}

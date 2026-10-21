"use client";
import { useContext, useState } from "react";
import { toast } from "sonner";
import { useAuthUser, signOut } from "@/components/providers/auth-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { AvatarPicker } from "@/components/profile/avatar-picker";
import { LanguageContext } from "@/components/providers/language-provider";

export function ProfileEditor({ showAccountActions = true }: { showAccountActions?: boolean }) {
  const { language } = useContext(LanguageContext);
  const tr = language === "tr";
  const { user, loading } = useAuthUser();
  const [busy, setBusy] = useState(false);
  return <form className="profile-editor" onSubmit={async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const { error } = await getSupabaseBrowserClient().auth.updateUser({ data: { full_name: String(form.get("name") ?? "").trim() } });
      if (error) throw error;
      // Server layout syncs only display metadata, never authorization metadata.
      window.location.reload();
    } catch { toast.error(tr ? "Profil güncellenemedi." : "Unable to update profile."); setBusy(false); }
  }}>
    <AvatarPicker name={typeof user?.user_metadata.full_name === "string" ? user.user_metadata.full_name : user?.email ?? ""} />
    <label className="block">{tr ? "Ad soyad" : "Full name"}<Input key={user?.updated_at} name="name" defaultValue={typeof user?.user_metadata.full_name === "string" ? user.user_metadata.full_name : ""} maxLength={100} required disabled={loading || busy} /></label>
    <label className="block">{tr ? "E-posta" : "Email"}<Input value={user?.email ?? ""} readOnly /></label>
    <Button type="submit" disabled={loading || busy}>{tr ? "Profili kaydet" : "Save profile"}</Button>
    {showAccountActions && <><Link href="/update-password" className="block underline">{tr ? "Şifreyi değiştir" : "Change password"}</Link>
    <Button type="button" variant="outline" disabled={busy} onClick={() => { setBusy(true); void signOut().catch(() => { toast.error("Çıkış yapılamadı."); setBusy(false); }); }}>{tr ? "Çıkış yap" : "Sign out"}</Button></>}
  </form>;
}

"use client";
import { useState } from "react";
import { toast } from "sonner";
import { useAuthUser, signOut } from "@/components/providers/auth-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export function ProfileEditor() {
  const { user, loading } = useAuthUser();
  const [busy, setBusy] = useState(false);
  return <form className="space-y-4" onSubmit={async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const { error } = await getSupabaseBrowserClient().auth.updateUser({ data: { full_name: String(form.get("name") ?? "").trim() } });
      if (error) throw error;
      // Server layout syncs only display metadata, never authorization metadata.
      window.location.reload();
    } catch { toast.error("Profil güncellenemedi."); setBusy(false); }
  }}>
    <label className="block">Ad soyad<Input key={user?.updated_at} name="name" defaultValue={typeof user?.user_metadata.full_name === "string" ? user.user_metadata.full_name : ""} maxLength={100} required disabled={loading || busy} /></label>
    <label className="block">E-posta<Input value={user?.email ?? ""} readOnly /></label>
    <Button type="submit" disabled={loading || busy}>Profili kaydet</Button>
    <Link href="/update-password" className="block underline">Şifreyi değiştir</Link>
    <Button type="button" variant="outline" disabled={busy} onClick={() => { setBusy(true); void signOut().catch(() => { toast.error("Çıkış yapılamadı."); setBusy(false); }); }}>Çıkış yap</Button>
  </form>;
}

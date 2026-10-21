"use client";

import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { Camera, Check } from "lucide-react";
import { toast } from "sonner";
import { ProfileAvatar } from "./profile-avatar";
import { avatarIcons, type AvatarIcon, type ProfileAvatarData } from "@/lib/profile/avatar";
import { notifyFinanceDataChanged } from "@/lib/finance/data-events";
import { LanguageContext } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";

async function preparePhoto(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) throw new Error();
  const image = await createImageBitmap(file);
  try {
    if (!image.width || !image.height || image.width > 8192 || image.height > 8192) throw new Error();
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const context = canvas.getContext("2d");
    if (!context) throw new Error();
    const edge = Math.min(image.width, image.height);
    context.drawImage(image, (image.width - edge) / 2, (image.height - edge) / 2, edge, edge, 0, 0, 256, 256);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.9));
    if (!blob) throw new Error();
    return new File([blob], "avatar.webp", { type: blob.type });
  } finally { image.close(); }
}

export function useOwnAvatar() {
  const [avatar, setAvatar] = useState<ProfileAvatarData | null>(null);
  const reload = useCallback(async () => {
    try {
      const response = await fetch("/api/account/avatar", { cache: "no-store" });
      if (response.ok) setAvatar(await response.json() as ProfileAvatarData);
    } catch { /* Keep initials when the profile picture is unavailable. */ }
  }, []);
  useEffect(() => {
    const timeout = window.setTimeout(() => void reload(), 0);
    window.addEventListener("budgetbuddy:avatar-updated", reload);
    return () => { window.clearTimeout(timeout); window.removeEventListener("budgetbuddy:avatar-updated", reload); };
  }, [reload]);
  return avatar;
}

export function AvatarPicker({ name }: { name: string }) {
  const { language } = useContext(LanguageContext);
  const tr = language === "tr";
  const avatar = useOwnAvatar();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const labels = tr ? ["Baş harfler", "Kedi", "Köpek", "Çiçek", "Güneş", "Dağ"] : ["Initials", "Cat", "Dog", "Flower", "Sun", "Mountain"];

  async function save(selection: AvatarIcon | File) {
    setBusy(true);
    try {
      let body: FormData | string;
      if (typeof selection === "string") body = JSON.stringify({ icon: selection });
      else { body = new FormData(); body.set("file", await preparePhoto(selection)); }
      const response = await fetch("/api/account/avatar", { method: typeof selection === "string" ? "PATCH" : "POST", headers: typeof body === "string" ? { "Content-Type": "application/json" } : undefined, body });
      if (!response.ok) throw new Error();
      window.dispatchEvent(new Event("budgetbuddy:avatar-updated"));
      notifyFinanceDataChanged();
      toast.success(tr ? "Profil görselin güncellendi." : "Profile picture updated.");
    } catch { toast.error(tr ? "Görsel kaydedilemedi. JPG, PNG veya WebP (en fazla 5 MB) seçip tekrar dene." : "Unable to save. Choose a JPG, PNG or WebP up to 5 MB and retry."); }
    finally { setBusy(false); if (input.current) input.current.value = ""; }
  }

  return <div className="avatar-picker" aria-busy={busy}>
    <div className="avatar-picker-preview"><ProfileAvatar name={name} avatar={avatar} /><div><b>{tr ? "Profil görselin" : "Your profile picture"}</b><p>{tr ? "Bir fotoğraf yükle veya simge seç." : "Upload a photo or choose an icon."}</p><Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => input.current?.click()}><Camera data-icon="inline-start" />{tr ? "Fotoğraf yükle" : "Upload photo"}</Button></div></div>
    <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label={tr ? "Profil fotoğrafı" : "Profile photo"} disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void save(file); }} />
    <div className="avatar-icon-options" role="group" aria-label={tr ? "Hazır profil simgeleri" : "Default profile icons"}>{avatarIcons.map((icon, index) => <button type="button" key={icon} disabled={busy} aria-label={labels[index]} aria-pressed={avatar?.icon === icon && !avatar.url} onClick={() => void save(icon)}><ProfileAvatar name={name} avatar={{ icon, url: null }} />{avatar?.icon === icon && !avatar.url && <Check className="avatar-selected-check" aria-hidden="true" />}</button>)}</div>
    {busy && <small role="status">{tr ? "Kaydediliyor…" : "Saving…"}</small>}
  </div>;
}

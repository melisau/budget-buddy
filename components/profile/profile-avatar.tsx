"use client";

import { useState } from "react";
import { Cat, Dog, Flower2, Mountain, Sun } from "lucide-react";
import type { ProfileAvatarData } from "@/lib/profile/avatar";

const icons = { cat: Cat, dog: Dog, flower: Flower2, sun: Sun, mountain: Mountain };

export function ProfileAvatar({ name, avatar, className = "" }: { name: string; avatar?: ProfileAvatarData | null; className?: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const Icon = avatar?.icon && avatar.icon !== "initials" ? icons[avatar.icon] : undefined;
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toLocaleUpperCase("tr-TR") || "?";
  return <span className={`profile-avatar ${className}`} data-avatar={avatar?.icon ?? "initials"} aria-hidden="true">
    {/* Private signed image URLs cannot use a public image optimizer/cache. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {avatar?.url && avatar.url !== failedUrl ? <img src={avatar.url} alt="" referrerPolicy="no-referrer" onError={() => setFailedUrl(avatar.url)} /> : Icon ? <Icon /> : initials}
  </span>;
}

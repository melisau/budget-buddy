import type { MetadataRoute } from "next";
import { BRAND_COLOR, SITE_NAME } from "@/lib/site";

// Used by browsers for "Install app" and by the Android (Trusted Web Activity)
// package. Keep `id`, `start_url` and `scope` stable: changing them makes
// installed copies look like a different app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: "Gelir ve giderlerini takip et, bütçe planla, birikim hedeflerine ulaş ve aile bütçeni paylaş.",
    lang: "tr",
    dir: "ltr",
    start_url: "/dashboard?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f7fb",
    theme_color: BRAND_COLOR,
    categories: ["finance", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "İşlem ekle", short_name: "İşlemler", url: "/transactions?source=shortcut", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Bütçeler", short_name: "Bütçeler", url: "/budgets?source=shortcut", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}

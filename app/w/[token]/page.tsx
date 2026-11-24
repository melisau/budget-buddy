import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Gift } from "lucide-react";
import { isShareToken, publicWishlistItem, type Occasion } from "@/lib/finance/wishlist";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { localized } from "@/lib/i18n/localized";

// Read-only view of a wishlist shared by link. No sign-in; the token is the
// only credential, so reservations and owner identity are never sent here.
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Wishlist",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const occasionLabels: Record<Occasion, { tr: string; en: string }> = {
  birthday: { tr: "Doğum günü", en: "Birthday" }, housewarming: { tr: "Ev hediyesi", en: "Housewarming" },
  new_year: { tr: "Yılbaşı", en: "New Year" }, other: { tr: "Diğer", en: "Other" },
};

export default async function SharedWishlistPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isShareToken(token)) notFound();
  const supabase = getSupabaseServerClient();
  const { data: list, error } = await supabase.from("wishlists").select("id, title, occasion, event_date").eq("share_token", token).maybeSingle();
  if (error) throw error;
  if (!list) notFound();
  const items = await supabase.from("wishlist_items").select("id, name, note, product_url").eq("wishlist_id", list.id).order("created_at");
  if (items.error) throw items.error;
  const wishes = (items.data ?? []).map(publicWishlistItem);
  const tr = ((await headers()).get("accept-language") ?? "tr").toLowerCase().startsWith("tr");
  const occasion = occasionLabels[list.occasion as Occasion] ?? occasionLabels.other;

  return <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-4 px-4 py-10">
    <article className="panel wishlist-card">
      <span className="text-xs font-bold uppercase tracking-wide text-[var(--c-t-5267df)]">{tr ? occasion.tr : occasion.en}</span>
      <h1 className="mt-1 text-xl font-bold">{list.title}</h1>
      {list.event_date && <p className="mt-1 text-sm text-[var(--c-t-737c91)]">{list.event_date}</p>}
      <ul className="wishlist-items mt-3">
        {wishes.length === 0 ? <li className="wishlist-empty flex items-center gap-2"><Gift className="size-4" />{tr ? "Bu listede henüz dilek yok." : localized("No wishes on this list yet.")}</li>
          : wishes.map((item) => <li key={item.id} className="wishlist-item"><span className="min-w-0 flex-1"><b className="block text-sm break-words">{item.name}</b>{item.note && <small className="block break-words text-[var(--c-t-737c91)]">{item.note}</small>}{item.productUrl && <a href={item.productUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-xs font-semibold text-[var(--c-t-4258d5)] underline">{tr ? "Ürüne bak" : localized("View product")}</a>}</span></li>)}
      </ul>
    </article>
    <p className="text-center text-xs text-[var(--c-t-737c91)]">{tr ? "Bu liste sadece görüntülenebilir." : localized("This list is view-only.")} · <Link href="/" className="underline">Budget Buddy</Link></p>
  </main>;
}

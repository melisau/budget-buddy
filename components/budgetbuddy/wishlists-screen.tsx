"use client";

import Link from "next/link";
import { useCallback, useContext, useEffect, useState } from "react";
import { Check, Gift, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { LanguageContext } from "@/components/providers/language-provider";
import type { Occasion } from "@/lib/finance/wishlist";

type Group = { id: string; name: string };
type Wish = { id: string; name: string; note: string; productUrl: string | null; reserved: boolean | null; reservedByMe: boolean };
type List = { id: string; familyGroupId: string; mine: boolean; title: string; occasion: Occasion; eventDate: string | null; surprise: boolean; items: Wish[] };
const occasionLabels: Record<Occasion, { tr: string; en: string }> = {
  birthday: { tr: "Doğum günü", en: "Birthday" }, housewarming: { tr: "Ev hediyesi", en: "Housewarming" },
  new_year: { tr: "Yılbaşı", en: "New Year" }, other: { tr: "Diğer", en: "Other" },
};

export function WishlistsScreen() {
  const { language } = useContext(LanguageContext);
  const tr = language === "tr";
  const [groups, setGroups] = useState<Group[]>([]);
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [groupId, setGroupId] = useState("");
  const [title, setTitle] = useState("");
  const [occasion, setOccasion] = useState<Occasion>("birthday");
  const [eventDate, setEventDate] = useState("");
  const [surprise, setSurprise] = useState(true);
  const [wishDrafts, setWishDrafts] = useState<Record<string, { name: string; note: string; productUrl: string }>>({});

  const load = useCallback(async () => {
    try {
      const [groupsResponse, listsResponse] = await Promise.all([fetch("/api/family", { cache: "no-store" }), fetch("/api/wishlists", { cache: "no-store" })]);
      if (!groupsResponse.ok || !listsResponse.ok) throw new Error();
      const [groupsData, listsData] = await Promise.all([groupsResponse.json(), listsResponse.json()]) as [{ groups?: Group[] }, { lists?: List[] }];
      setGroups(groupsData.groups ?? []); setLists(listsData.lists ?? []); setLoadError(false);
      setGroupId((value) => value || groupsData.groups?.[0]?.id || "");
    } catch { setLoadError(true); toast.error(tr ? "Dilek listeleri yüklenemedi." : "Unable to load wishlists."); }
    finally { setLoading(false); }
  }, [tr]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  async function send(url: string, method: "POST" | "PATCH" | "DELETE", body: Record<string, unknown>, success: string) {
    setBusy(true);
    try {
      const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!response.ok) { const result = await response.json().catch(() => ({})) as { error?: string }; throw new Error(result.error || "Request failed"); }
      await load(); toast.success(success); return true;
    } catch (error) { toast.error(error instanceof Error ? error.message : (tr ? "İşlem başarısız." : "Action failed.")); return false; }
    finally { setBusy(false); }
  }

  return <section className="wishlists-page">
    <div className="page-head wishlist-page-head"><div><h2>{tr ? "Dilek listeleri" : "Wishlists"}</h2><p>{tr ? "Dileklerini paylaş, sürprizi koru." : "Share your wishes. Keep the surprise."}</p></div><div className="wishlist-toolbar"><Button variant="ghost" size="icon" disabled={busy || loading} aria-label={tr ? "Yenile" : "Refresh"} onClick={() => void load()}><RefreshCw /></Button><Button disabled={loading || loadError || !groups.length} onClick={() => setCreateOpen(true)}><Plus />{tr ? "Yeni liste" : "New list"}</Button></div></div>

    {loadError && <p role="alert" className="form-error">{tr ? "Dilek listeleri yüklenemedi. Yenile düğmesiyle tekrar deneyin." : "Unable to load wishlists. Please refresh."}</p>}

    {loading ? <div className="panel">{tr ? "Yükleniyor…" : "Loading…"}</div> : !loadError && groups.length === 0 ? <div className="panel empty-accounts"><Gift /><h3>{tr ? "Önce bir aile grubu oluştur" : "Create a family group first"}</h3><p>{tr ? "Dileklerini yalnızca grubun kabul edilmiş üyeleri görebilir." : "Only accepted group members can see your wishes."}</p><Button asChild><Link href="/family">{tr ? "Aile grubuna git" : "Go to family"}</Link></Button></div> : loadError ? null : <>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}><DialogContent className="wishlist-create-dialog"><DialogHeader><DialogTitle>{tr ? "Yeni dilek listesi" : "New wishlist"}</DialogTitle><DialogDescription>{tr ? "Özel günün için bir liste oluştur, ailenle paylaş." : "Create a list for your special occasion and share it with family."}</DialogDescription></DialogHeader><form className="wishlist-create-form grid gap-4 sm:grid-cols-2" onSubmit={async (event) => { event.preventDefault(); if (await send("/api/wishlists", "POST", { familyGroupId: groupId, title, occasion, eventDate, surprise }, tr ? "Dilek listesi oluşturuldu." : "Wishlist created.")) { setTitle(""); setCreateOpen(false); setOccasion("birthday"); setEventDate(""); setSurprise(true); } }}>

        <label className="grid gap-1 text-sm font-semibold">{tr ? "Liste adı" : "List name"}<Input value={title} minLength={2} maxLength={100} onChange={(event) => setTitle(event.target.value)} placeholder={tr ? "Örn. Doğum günü dileklerim" : "E.g. My birthday wishes"} required /></label>
        <label className="grid gap-1 text-sm font-semibold">{tr ? "Aile grubu" : "Family group"}<select value={groupId} onChange={(event) => setGroupId(event.target.value)} className="h-9 rounded-md border border-[#dfe3ed] bg-white px-3" required>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>
        <label className="grid gap-1 text-sm font-semibold">{tr ? "Özel gün" : "Occasion"}<select value={occasion} onChange={(event) => setOccasion(event.target.value as Occasion)} className="h-9 rounded-md border border-[#dfe3ed] bg-white px-3">{Object.entries(occasionLabels).map(([value, label]) => <option key={value} value={value}>{tr ? label.tr : label.en}</option>)}</select></label>
        <label className="grid gap-1 text-sm font-semibold">{tr ? "Tarih (isteğe bağlı)" : "Date (optional)"}<Input type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} /></label>
        <label className="flex items-start gap-3 rounded-xl bg-[#eef0ff] p-3 text-sm sm:col-span-2"><input type="checkbox" checked={surprise} onChange={(event) => setSurprise(event.target.checked)} className="mt-1" /><span><b>{tr ? "Sürpriz olsun" : "Keep it a surprise"}</b><small className="mt-1 block text-[#66708b]">{tr ? "Hediyeyi kimin seçtiğini ve seçilip seçilmediğini sen göremezsin; diğer üyeler görür." : "You cannot see reservation status; other members can."}</small></span></label>
        <Button type="submit" disabled={busy || !groupId || title.trim().length < 2} className="sm:col-span-2"><Plus />{tr ? "Liste oluştur" : "Create list"}</Button>
      </form></DialogContent></Dialog>

      {loading && !lists.length ? <div className="panel">{tr ? "Yükleniyor…" : "Loading…"}</div> : lists.length === 0 ? <div className="panel empty-accounts"><Gift /><h3>{tr ? "Henüz dilek listesi yok" : "No wishlists yet"}</h3><p>{tr ? "İlk listeyi oluşturup ailenle paylaş." : "Create the first list for your family."}</p></div> : <div className="wishlist-grid">{lists.map((list) => {
        const draft = wishDrafts[list.id] ?? { name: "", note: "", productUrl: "" };
        return <article key={list.id} className="panel wishlist-card"><div className="flex items-start justify-between gap-3"><div><span className="text-xs font-bold uppercase tracking-wide text-[#5267df]">{tr ? occasionLabels[list.occasion].tr : occasionLabels[list.occasion].en} · {groups.find((group) => group.id === list.familyGroupId)?.name}</span><h3 className="mt-1 text-base font-bold">{list.title}</h3>{list.eventDate && <p className="mt-1 text-sm text-[#737c91]">{list.eventDate}</p>}</div>{list.mine && <button type="button" disabled={busy} aria-label={tr ? "Listeyi sil" : "Delete list"} onClick={() => { if (window.confirm(tr ? "Bu liste ve tüm dilekler silinsin mi?" : "Delete this list and all wishes?")) void send(`/api/wishlists/${list.id}`, "DELETE", {}, tr ? "Liste silindi." : "List deleted."); }}><Trash2 className="text-[#8991a4]" /></button>}</div>
          {list.mine && <label className="wishlist-surprise-toggle"><input type="checkbox" checked={list.surprise} disabled={busy} onChange={(event) => void send(`/api/wishlists/${list.id}`, "PATCH", { action: "settings", surprise: event.target.checked }, tr ? "Görünürlük güncellendi." : "Visibility updated.")} />{tr ? "Sürpriz modu" : "Hide reservations from me (surprise)"}</label>}
          <ul className="wishlist-items">{list.items.length === 0 && <li className="wishlist-empty">{tr ? "İlk dileğini ekleyerek başla." : "Start with your first wish."}</li>}{list.items.map((item) => <li key={item.id} className="wishlist-item"><span className="min-w-0 flex-1"><b className="block text-sm">{item.name}</b>{item.note && <small className="block text-[#737c91]">{item.note}</small>}{item.productUrl && <a href={item.productUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-[#4258d5] underline">{tr ? "Ürüne bak" : "View product"}</a>}</span>{list.mine ? <>{item.reserved === null ? <span className="text-xs text-[#8991a4]">{tr ? "Sürpriz" : "Surprise"}</span> : <span className="text-xs text-[#66708b]">{item.reserved ? (tr ? "Seçildi" : "Reserved") : (tr ? "Boşta" : "Available")}</span>}<button type="button" disabled={busy} aria-label={`${item.name} ${tr ? "sil" : "delete"}`} onClick={() => void send(`/api/wishlists/${list.id}`, "DELETE", { itemId: item.id }, tr ? "Dilek silindi." : "Wish removed.")}><Trash2 className="size-4 text-[#8991a4]" /></button></> : item.reservedByMe ? <Button size="sm" variant="outline" disabled={busy} onClick={() => void send(`/api/wishlists/${list.id}`, "PATCH", { action: "release", itemId: item.id }, tr ? "Seçim kaldırıldı." : "Reservation released.")}>{tr ? "Seçimimi kaldır" : "Release"}</Button> : item.reserved ? <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700"><Check className="size-4" />{tr ? "Seçildi" : "Reserved"}</span> : <Button size="sm" disabled={busy} onClick={() => void send(`/api/wishlists/${list.id}`, "PATCH", { action: "reserve", itemId: item.id }, tr ? "Hediye seçildi." : "Gift reserved.")}>{tr ? "Ben alacağım" : "I'll get this"}</Button>}</li>)}</ul>
          {list.mine && <Dialog open={addingTo === list.id} onOpenChange={(open) => setAddingTo(open ? list.id : null)}><DialogTrigger asChild><Button type="button" variant="ghost" className="wishlist-add-button"><Plus />{tr ? "Dilek ekle" : "Add wish"}</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>{tr ? "Dilek ekle" : "Add wish"}</DialogTitle><DialogDescription>{list.title}</DialogDescription></DialogHeader><form className="grid gap-3" onSubmit={async (event) => { event.preventDefault(); if (await send(`/api/wishlists/${list.id}`, "PATCH", { action: "add", ...draft }, tr ? "Dilek eklendi." : "Wish added.")) { setWishDrafts((value) => ({ ...value, [list.id]: { name: "", note: "", productUrl: "" } })); setAddingTo(null); } }}><Input aria-label={tr ? "Dilek adı" : "Wish name"} placeholder={tr ? "Dileğine bir ad ver" : "Name your wish"} value={draft.name} maxLength={120} onChange={(event) => setWishDrafts((value) => ({ ...value, [list.id]: { ...draft, name: event.target.value } }))} required /><Input aria-label={tr ? "Ürün bağlantısı" : "Product link"} type="url" placeholder={tr ? "Ürün bağlantısı (isteğe bağlı)" : "Product link (optional)"} value={draft.productUrl} maxLength={500} onChange={(event) => setWishDrafts((value) => ({ ...value, [list.id]: { ...draft, productUrl: event.target.value } }))} /><Input aria-label={tr ? "Dilek notu" : "Wish note"} placeholder={tr ? "Renk, beden veya kısa not" : "Color, size or short note"} value={draft.note} maxLength={300} onChange={(event) => setWishDrafts((value) => ({ ...value, [list.id]: { ...draft, note: event.target.value } }))} /><Button type="submit" variant="outline" disabled={busy || !draft.name.trim()}><Plus />{tr ? "Dilek ekle" : "Add wish"}</Button></form></DialogContent></Dialog>}
        </article>;
      })}</div>}
    </>}
  </section>;
}

"use client";

import { useCallback, useContext, useEffect, useState } from "react";
import { Check, Copy, Gift, Link2, Link2Off, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { LanguageContext } from "@/components/providers/language-provider";
import type { Occasion } from "@/lib/finance/wishlist";
import { RequiredMark } from "@/components/ui/required-mark";
import { localized } from "@/lib/i18n/localized";

type Group = { id: string; name: string };
type Wish = { id: string; name: string; note: string; productUrl: string | null; reserved: boolean | null; reservedByMe: boolean };
type List = { id: string; familyGroupId: string | null; mine: boolean; title: string; occasion: Occasion; eventDate: string | null; surprise: boolean; shareToken: string | null; items: Wish[] };
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
    } catch { setLoadError(true); toast.error(tr ? "Dilek listeleri yüklenemedi." : localized("Unable to load wishlists.")); }
    finally { setLoading(false); }
  }, [tr]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  async function send(url: string, method: "POST" | "PATCH" | "DELETE", body: Record<string, unknown>, success: string) {
    setBusy(true);
    try {
      const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!response.ok) { const result = await response.json().catch(() => ({})) as { error?: string }; throw new Error(result.error || "Request failed"); }
      await load(); toast.success(success); return true;
    } catch (error) { toast.error(error instanceof Error ? error.message : (tr ? "İşlem başarısız." : localized("Action failed."))); return false; }
    finally { setBusy(false); }
  }

  function shareUrl(token: string) { return typeof window === "undefined" ? `/w/${token}` : `${window.location.origin}/w/${token}`; }
  async function copyLink(token: string) {
    try { await navigator.clipboard.writeText(shareUrl(token)); toast.success(tr ? "Link kopyalandı." : localized("Link copied.")); }
    catch { toast.error(tr ? "Kopyalanamadı; linki elle seç." : localized("Could not copy; select the link manually.")); }
  }

  return <section className="wishlists-page">
    <div className="wishlist-page-head"><p>{tr ? "Özel günlerin için dilek listesi oluştur, istersen ailenle ya da bir bağlantıyla paylaş. Sürpriz modunda kimin ne aldığını sen görmezsin." : localized("Make wishlists for special days and share them with family or a link. In surprise mode you cannot see who reserved what.")}</p><Button disabled={loading || loadError} onClick={() => setCreateOpen(true)}><Plus />{tr ? "Yeni liste" : localized("New list")}</Button></div>

    {loadError && <p role="alert" className="form-error">{tr ? "Dilek listeleri yüklenemedi. Yenile düğmesiyle tekrar deneyin." : localized("Unable to load wishlists. Please refresh.")}</p>}

    {loading ? <div className="panel">{tr ? "Yükleniyor…" : localized("Loading…")}</div>  : loadError ? null : <>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}><DialogContent className="wishlist-create-dialog"><DialogHeader><DialogTitle>{tr ? "Yeni dilek listesi" : localized("New wishlist")}</DialogTitle><DialogDescription>{tr ? "Özel günün için bir liste oluştur; istersen ailenle paylaş." : localized("Create a list for your special occasion and share it with family if you like.")}</DialogDescription></DialogHeader><form className="wishlist-create-form grid gap-4 sm:grid-cols-2" onSubmit={async (event) => { event.preventDefault(); if (await send("/api/wishlists", "POST", { familyGroupId: groupId, title, occasion, eventDate, surprise }, tr ? "Dilek listesi oluşturuldu." : localized("Wishlist created."))) { setTitle(""); setCreateOpen(false); setOccasion("birthday"); setEventDate(""); setSurprise(true); } }}>

        <label className="grid gap-1 text-sm font-semibold"><span className="field-label">{tr ? "Liste adı" : localized("List name")}<RequiredMark /></span><Input value={title} minLength={2} maxLength={100} onChange={(event) => setTitle(event.target.value)} placeholder={tr ? "Örn. Doğum günü dileklerim" : localized("E.g. My birthday wishes")} required /></label>
        <label className="grid gap-1 text-sm font-semibold"><span className="field-label">{tr ? "Kimlerle paylaşılsın?" : localized("Share with")}<RequiredMark /></span><select value={groupId} onChange={(event) => setGroupId(event.target.value)} className="h-9 rounded-md border border-[var(--c-s-dfe3ed)] bg-[var(--c-s-ffffff)] px-3"><option value="">{tr ? "Sadece ben (kişisel)" : localized("Only me (personal)")}</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>
        <label className="grid gap-1 text-sm font-semibold"><span className="field-label">{tr ? "Özel gün" : localized("Occasion")}<RequiredMark /></span><select value={occasion} onChange={(event) => setOccasion(event.target.value as Occasion)} className="h-9 rounded-md border border-[var(--c-s-dfe3ed)] bg-[var(--c-s-ffffff)] px-3">{Object.entries(occasionLabels).map(([value, label]) => <option key={value} value={value}>{tr ? label.tr : localized(label.en)}</option>)}</select></label>
        <label className="grid gap-1 text-sm font-semibold">{tr ? "Tarih (isteğe bağlı)" : localized("Date (optional)")}<Input type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} /></label>
        <label className="flex items-start gap-3 rounded-xl bg-[var(--c-s-eef0ff)] p-3 text-sm sm:col-span-2"><input type="checkbox" checked={surprise} onChange={(event) => setSurprise(event.target.checked)} className="mt-1" /><span><b>{tr ? "Sürpriz olsun" : localized("Keep it a surprise")}</b><small className="mt-1 block text-[var(--c-t-66708b)]">{tr ? "Hediyeyi kimin seçtiğini ve seçilip seçilmediğini sen göremezsin; diğer üyeler görür." : localized("You cannot see reservation status; other members can.")}</small></span></label>
        <Button type="submit" disabled={busy || title.trim().length < 2} className="sm:col-span-2"><Plus />{tr ? "Liste oluştur" : localized("Create list")}</Button>
      </form></DialogContent></Dialog>

      {loading && !lists.length ? <div className="panel">{tr ? "Yükleniyor…" : localized("Loading…")}</div> : lists.length === 0 ? <div className="panel empty-accounts"><Gift /><h3>{tr ? "Henüz dilek listesi yok" : localized("No wishlists yet")}</h3><p>{tr ? "İlk listeni oluştur; istersen ailenle paylaş." : localized("Create your first list and share it with family if you like.")}</p></div> : <div className="wishlist-grid">{lists.map((list) => {
        const draft = wishDrafts[list.id] ?? { name: "", note: "", productUrl: "" };
        return <article key={list.id} className="panel wishlist-card"><header className="wishlist-card-head"><div className="min-w-0"><span className="wishlist-meta">{tr ? occasionLabels[list.occasion].tr : localized(occasionLabels[list.occasion].en)} · {list.familyGroupId ? groups.find((group) => group.id === list.familyGroupId)?.name : (tr ? "Kişisel" : localized("Personal"))}</span><h3>{list.title}</h3>{list.eventDate && <p>{new Intl.DateTimeFormat(tr ? "tr-TR" : localized("en-US"), { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${list.eventDate}T00:00:00Z`))}</p>}</div>{list.mine && <div className="wishlist-card-actions">{!list.shareToken && <Button type="button" variant="ghost" size="icon" disabled={busy} title={tr ? "Görüntüleme bağlantısı oluştur" : localized("Create a view-only link")} aria-label={tr ? "Bağlantıyla paylaş" : localized("Share with a link")} onClick={() => void send(`/api/wishlists/${list.id}/share`, "POST", {}, tr ? "Paylaşım linki oluşturuldu. Linke sahip olan herkes listeyi görüntüleyebilir." : localized("Share link created. Anyone with the link can view the list."))}><Link2 /></Button>}<Button type="button" variant="ghost" size="icon" disabled={busy} aria-label={tr ? "Listeyi sil" : localized("Delete list")} onClick={() => { if (window.confirm(tr ? "Bu liste ve tüm dilekler silinsin mi?" : localized("Delete this list and all wishes?"))) void send(`/api/wishlists/${list.id}`, "DELETE", {}, tr ? "Liste silindi." : localized("List deleted.")); }}><Trash2 /></Button></div>}</header>
          {list.mine && <label className={`wishlist-surprise-chip ${list.surprise ? "on" : ""}`}><input type="checkbox" checked={list.surprise} disabled={busy} onChange={(event) => void send(`/api/wishlists/${list.id}`, "PATCH", { action: "settings", surprise: event.target.checked }, tr ? "Görünürlük güncellendi." : localized("Visibility updated."))} /><Gift aria-hidden="true" />{list.surprise ? (tr ? "Sürpriz modu açık" : localized("Surprise mode on")) : (tr ? "Sürpriz modu kapalı" : localized("Surprise mode off"))}</label>}
          {list.mine && list.shareToken && <div className="wishlist-share"><Link2 aria-hidden="true" /><Input readOnly aria-label={tr ? "Paylaşım linki" : localized("Share link")} value={shareUrl(list.shareToken)} onFocus={(event) => event.currentTarget.select()} /><Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => void copyLink(list.shareToken!)}><Copy />{tr ? "Kopyala" : localized("Copy")}</Button><Button type="button" size="sm" variant="ghost" disabled={busy} aria-label={tr ? "Paylaşımı kapat" : localized("Turn off sharing")} onClick={() => { if (window.confirm(tr ? "Paylaşım linki kapatılsın mı? Linke sahip olanlar listeyi artık göremez." : localized("Turn off the share link? People with the link will no longer see the list."))) void send(`/api/wishlists/${list.id}/share`, "DELETE", {}, tr ? "Paylaşım kapatıldı." : localized("Sharing turned off.")); }}><Link2Off /></Button></div>}
          <ul className="wishlist-items">{list.items.length === 0 && <li className="wishlist-empty">{tr ? "İlk dileğini ekleyerek başla." : localized("Start with your first wish.")}</li>}{list.items.map((item) => <li key={item.id} className="wishlist-item"><span className="min-w-0 flex-1"><b className="block text-sm">{item.name}</b>{item.note && <small className="block text-[var(--c-t-737c91)]">{item.note}</small>}{item.productUrl && <a href={item.productUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-[var(--c-t-4258d5)] underline">{tr ? "Ürüne bak" : localized("View product")}</a>}</span>{list.mine ? <>{item.reserved === null ? null : <span className="text-xs text-[var(--c-t-66708b)]">{item.reserved ? (tr ? "Seçildi" : localized("Reserved")) : (tr ? "Boşta" : localized("Available"))}</span>}<button type="button" disabled={busy} aria-label={`${item.name} ${tr ? "sil" : localized("delete")}`} onClick={() => void send(`/api/wishlists/${list.id}`, "DELETE", { itemId: item.id }, tr ? "Dilek silindi." : localized("Wish removed."))}><Trash2 className="size-4" /></button></> : item.reservedByMe ? <Button size="sm" variant="outline" disabled={busy} onClick={() => void send(`/api/wishlists/${list.id}`, "PATCH", { action: "release", itemId: item.id }, tr ? "Seçim kaldırıldı." : localized("Reservation released."))}>{tr ? "Seçimimi kaldır" : localized("Release")}</Button> : item.reserved ? <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700"><Check className="size-4" />{tr ? "Seçildi" : localized("Reserved")}</span> : <Button size="sm" disabled={busy} onClick={() => void send(`/api/wishlists/${list.id}`, "PATCH", { action: "reserve", itemId: item.id }, tr ? "Hediye seçildi." : localized("Gift reserved."))}>{tr ? "Ben alacağım" : localized("I'll get this")}</Button>}</li>)}</ul>
          {list.mine && <Dialog open={addingTo === list.id} onOpenChange={(open) => setAddingTo(open ? list.id : null)}><DialogTrigger asChild><Button type="button" variant="ghost" className="wishlist-add-button"><Plus />{tr ? "Dilek ekle" : localized("Add wish")}</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>{tr ? "Dilek ekle" : localized("Add wish")}</DialogTitle><DialogDescription>{list.title}</DialogDescription></DialogHeader><form className="grid gap-3" onSubmit={async (event) => { event.preventDefault(); if (await send(`/api/wishlists/${list.id}`, "PATCH", { action: "add", ...draft }, tr ? "Dilek eklendi." : localized("Wish added."))) { setWishDrafts((value) => ({ ...value, [list.id]: { name: "", note: "", productUrl: "" } })); setAddingTo(null); } }}><Input aria-label={tr ? "Dilek adı" : localized("Wish name")} placeholder={tr ? "Dileğine bir ad ver" : localized("Name your wish")} value={draft.name} maxLength={120} onChange={(event) => setWishDrafts((value) => ({ ...value, [list.id]: { ...draft, name: event.target.value } }))} required /><Input aria-label={tr ? "Ürün bağlantısı" : localized("Product link")} type="url" placeholder={tr ? "Ürün bağlantısı (isteğe bağlı)" : localized("Product link (optional)")} value={draft.productUrl} maxLength={500} onChange={(event) => setWishDrafts((value) => ({ ...value, [list.id]: { ...draft, productUrl: event.target.value } }))} /><Input aria-label={tr ? "Dilek notu" : localized("Wish note")} placeholder={tr ? "Renk, beden veya kısa not" : localized("Color, size or short note")} value={draft.note} maxLength={300} onChange={(event) => setWishDrafts((value) => ({ ...value, [list.id]: { ...draft, note: event.target.value } }))} /><Button type="submit" variant="outline" disabled={busy || !draft.name.trim()}><Plus />{tr ? "Dilek ekle" : localized("Add wish")}</Button></form></DialogContent></Dialog>}
        </article>;
      })}</div>}
    </>}
  </section>;
}

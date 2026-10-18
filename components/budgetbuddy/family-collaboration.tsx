"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Plus, RefreshCw, ShoppingBasket, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

type Item = { id: string; name: string; quantity: string; requested_by_user_id: string; checked_at: string | null };
type SharedGoal = { id: string; name: string; progress: number; sharedByUserId: string };
type Member = { userId: string | null; name: string };

export function FamilyCollaboration({ groupId, role, members, tr }: { groupId: string; role: "owner" | "member" | "viewer"; members: Member[]; tr: boolean }) {
  const [items, setItems] = useState<Item[]>([]);
  const [sharedGoals, setSharedGoals] = useState<SharedGoal[]>([]);
  const [viewerUserId, setViewerUserId] = useState("");
  const [note, setNote] = useState("");
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);
  const writable = role !== "viewer" && !loading && !loadError;
  const url = `/api/family/${groupId}/shopping`;
  const memberName = (id: string) => members.find((member) => member.userId === id)?.name ?? (tr ? "Aile üyesi" : "Family member");

  const reload = useCallback(async () => {
    try {
      const response = await fetch(`/api/family/${groupId}/shopping`, { cache: "no-store" });
      const data = await response.json() as { items?: Item[]; note?: string; sharedGoals?: SharedGoal[]; viewerUserId?: string };
      if (!response.ok) throw new Error();
      setItems(data.items ?? []); setNote(data.note ?? ""); setSharedGoals(data.sharedGoals ?? []); setViewerUserId(data.viewerUserId ?? ""); setLoadError(false);
    } catch { setLoadError(true); toast.error(tr ? "Aile listesi yüklenemedi." : "Unable to load the family list."); }
    finally { setLoading(false); }
  }, [groupId, tr]);
  useEffect(() => { const timer = window.setTimeout(() => void reload(), 0); return () => window.clearTimeout(timer); }, [reload]);

  async function mutate(method: "POST" | "PATCH" | "DELETE", body: Record<string, unknown>, success: string) {
    setBusy(true);
    try {
      const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!response.ok) throw new Error();
      await reload(); toast.success(success);
      return true;
    } catch { toast.error(tr ? "İşlem tamamlanamadı. Listeyi yenileyip tekrar deneyin." : "Unable to update the list. Refresh and try again."); return false; }
    finally { setBusy(false); }
  }
  const pending = items.filter((item) => !item.checked_at);
  const completed = items.filter((item) => item.checked_at);

  return <div className="grid gap-4 lg:grid-cols-2">
    {loadError && <p role="alert" className="form-error lg:col-span-2">{tr ? "Aile listesi yüklenemedi. Yenile düğmesiyle tekrar deneyin." : "Unable to load the family list. Please refresh."}</p>}
    <article className="panel space-y-4">
      <div className="flex items-start justify-between gap-3"><div><h3 className="m-0 flex items-center gap-2 text-lg font-bold"><ShoppingBasket className="text-[#5267df]" />{tr ? "Ortak alışveriş listesi" : "Shared shopping list"}</h3><p className="mt-1 text-sm text-[#737c91]">{tr ? "Herkes ihtiyacını ekler; alınanları işaretleyin." : "Add requests and check off what has been bought."}</p></div><Button variant="ghost" size="icon" aria-label={tr ? "Listeyi yenile" : "Refresh list"} onClick={() => void reload()}><RefreshCw /></Button></div>
      {writable && <form className="flex flex-wrap gap-2" onSubmit={async (event) => { event.preventDefault(); if (await mutate("POST", { name, quantity }, tr ? "Ürün eklendi." : "Item added.")) { setName(""); setQuantity(""); } }}><Input aria-label={tr ? "Ürün" : "Item"} placeholder={tr ? "Örn. süt" : "E.g. milk"} value={name} maxLength={120} onChange={(event) => setName(event.target.value)} className="h-10 min-w-[150px] flex-[2] bg-white" required /><Input aria-label={tr ? "Miktar" : "Quantity"} placeholder={tr ? "Miktar" : "Quantity"} value={quantity} maxLength={40} onChange={(event) => setQuantity(event.target.value)} className="h-10 min-w-[85px] flex-1 bg-white" /><Button type="submit" disabled={busy || !name.trim()}><Plus />{tr ? "Ekle" : "Add"}</Button></form>}
      {loading ? <p className="text-sm text-[#737c91]">{tr ? "Yükleniyor…" : "Loading…"}</p> : loadError ? null : pending.length === 0 ? <p className="rounded-xl bg-[#f5f7fb] p-4 text-sm text-[#737c91]">{tr ? "Alınacak ürün yok. İlk ihtiyacı ekleyin." : "Nothing to buy yet."}</p> : <ul className="space-y-2">{pending.map((item) => <li key={item.id} className="flex items-center gap-3 rounded-xl border border-[#e4e7ef] p-3"><button type="button" disabled={!writable || busy} aria-label={`${item.name} ${tr ? "alındı olarak işaretle" : "mark bought"}`} className="grid size-7 shrink-0 place-items-center rounded-lg border border-[#aab4ce] disabled:cursor-default" onClick={() => void mutate("PATCH", { itemId: item.id, checked: true }, tr ? "Alındı olarak işaretlendi." : "Marked bought.")} /><span className="min-w-0 flex-1"><b className="block text-sm">{item.name} {item.quantity && <span className="font-normal text-[#737c91]">· {item.quantity}</span>}</b><small className="text-[#8b93a5]">{memberName(item.requested_by_user_id)} {tr ? "istedi" : "requested"}</small></span>{(role === "owner" || item.requested_by_user_id === viewerUserId) && <button type="button" disabled={busy} aria-label={`${item.name} ${tr ? "sil" : "delete"}`} onClick={() => void mutate("DELETE", { itemId: item.id }, tr ? "Ürün silindi." : "Item removed.")}><Trash2 className="size-4 text-[#8991a4]" /></button>}</li>)}</ul>}
      {completed.length > 0 && <details className="text-sm"><summary className="cursor-pointer font-semibold text-[#66708b]">{tr ? `Alınanlar (${completed.length})` : `Bought (${completed.length})`}</summary><ul className="mt-2 space-y-2">{completed.map((item) => <li key={item.id} className="flex items-center gap-3 rounded-xl bg-[#f5f7fb] p-3 text-[#778097]"><button type="button" disabled={!writable || busy} aria-label={`${item.name} ${tr ? "yeniden alınacak" : "mark needed again"}`} className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#dfeee9] text-emerald-700" onClick={() => void mutate("PATCH", { itemId: item.id, checked: false }, tr ? "Tekrar listeye eklendi." : "Moved back to needed.")}><Check className="size-4" /></button><span className="flex-1 line-through">{item.name}</span>{role === "owner" && <button type="button" disabled={busy} aria-label={`${item.name} ${tr ? "sil" : "delete"}`} onClick={() => void mutate("DELETE", { itemId: item.id }, tr ? "Ürün silindi." : "Item removed.")}><Trash2 className="size-4" /></button>}</li>)}</ul></details>}
    </article>
    <div className="space-y-4">
      <article className="panel space-y-3"><h3 className="m-0 text-lg font-bold">{tr ? "Alışveriş notu" : "Shopping note"}</h3><p className="text-sm text-[#737c91]">{tr ? "Mağazaya giden kişi için güncel ihtiyaçları ve hatırlatmaları yazın." : "Keep the latest needs and reminders for whoever shops."}</p><textarea aria-label={tr ? "Alışveriş notu" : "Shopping note"} value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} readOnly={!writable} rows={5} placeholder={tr ? "Örn. süt laktozsuz olsun, deterjan bitiyor…" : "E.g. get lactose-free milk…"} className="w-full resize-y rounded-xl border border-[#dfe3ed] bg-white p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#7383e7]" />{writable && <Button variant="outline" disabled={busy} onClick={() => void mutate("PATCH", { note }, tr ? "Not kaydedildi." : "Note saved.")}>{tr ? "Notu kaydet" : "Save note"}</Button>}</article>
      <article className="panel space-y-3"><h3 className="m-0 text-lg font-bold">{tr ? "Paylaşılan hedefler" : "Shared goals"}</h3><p className="text-sm text-[#737c91]">{tr ? "Yalnızca sahibi paylaşmayı seçtiği hedeflerin ilerlemesi görünür; özel işlemler görünmez." : "Only opted-in goal progress is visible. Private transactions stay private."}</p>{sharedGoals.length ? sharedGoals.map((goal) => <div key={goal.id} className="space-y-2 rounded-xl bg-[#f5f7fb] p-3"><div className="flex justify-between gap-2 text-sm"><span><b>{goal.name}</b><small className="ml-2 text-[#8991a4]">{memberName(goal.sharedByUserId)}</small></span><b>{goal.progress}%</b></div><Progress value={goal.progress} /></div>) : <p className="text-sm text-[#8991a4]">{tr ? "Henüz paylaşılan hedef yok." : "No shared goals yet."}</p>}</article>
    </div>
  </div>;
}

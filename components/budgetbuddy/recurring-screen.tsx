"use client";

import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Minus, Pause, Pencil, Play, Plus, Repeat, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { LanguageContext } from "@/components/providers/language-provider";
import { categoryDisplayName } from "@/lib/finance/category-names";
import { daysUntil, subscriptionPresets, type Frequency } from "@/lib/finance/recurring";
import { RequiredMark } from "@/components/ui/required-mark";

type Item = {
  id: string; kind: "regular" | "subscription"; type: "income" | "expense"; title: string; amount: number; frequency: Frequency;
  monthlyAmount: number; startDate: string; nextDate: string; endDate: string | null; active: boolean;
  categoryId: string; categoryName: string; accountId: string; accountName: string;
};
type Option = { id: string; name: string; type?: "income" | "expense" };
type Data = { available: boolean; items: Item[]; categories: Option[]; accounts: Option[]; currency: string };
type Form = { id: string | null; kind: Item["kind"]; type: Item["type"]; title: string; amount: string; category: string; account: string; frequency: Frequency; startDate: string; endDate: string };

const selectClass = "h-9 rounded-md border border-[var(--c-s-dfe3ed)] bg-[var(--c-s-ffffff)] px-3";
const frequencyLabels: Record<Frequency, { tr: string; en: string }> = {
  weekly: { tr: "Haftalık", en: "Weekly" }, monthly: { tr: "Aylık", en: "Monthly" }, yearly: { tr: "Yıllık", en: "Yearly" },
};

function todayLocal() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date());
}

export function RecurringScreen() {
  const { language } = useContext(LanguageContext);
  const tr = language === "tr";
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<Form | null>(null);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/recurring", { cache: "no-store" });
      if (!response.ok) throw new Error();
      setData(await response.json() as Data); setLoadError(false);
    } catch { setLoadError(true); toast.error(tr ? "Tekrarlayanlar yüklenemedi." : "Unable to load recurring items."); }
    finally { setLoading(false); }
  }, [tr]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  const money = useMemo(() => {
    const formatter = new Intl.NumberFormat(tr ? "tr-TR" : "en-US", { style: "currency", currency: data?.currency ?? "TRY" });
    return (value: number) => formatter.format(value);
  }, [tr, data?.currency]);
  const dateText = (value: string) => new Intl.DateTimeFormat(tr ? "tr-TR" : "en-US", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));

  const items = data?.items ?? [];
  const subscriptions = items.filter((item) => item.kind === "subscription");
  const regular = items.filter((item) => item.kind === "regular");
  const subscriptionTotal = subscriptions.filter((item) => item.active).reduce((sum, item) => sum + item.monthlyAmount, 0);

  function openNew(kind: Item["kind"], title = "") {
    const categories = (data?.categories ?? []).filter((category) => category.type === "expense");
    const preferred = kind === "subscription" ? categories.find((category) => category.name === "Subscriptions") : undefined;
    setFormError("");
    setForm({ id: null, kind, type: "expense", title, amount: "", category: preferred?.id ?? "", account: "", frequency: "monthly", startDate: todayLocal(), endDate: "" });
  }
  function openEdit(item: Item) {
    setFormError("");
    setForm({ id: item.id, kind: item.kind, type: item.type, title: item.title, amount: String(item.amount), category: item.categoryId, account: item.accountId, frequency: item.frequency, startDate: item.startDate, endDate: item.endDate ?? "" });
  }

  async function send(url: string, method: "POST" | "PATCH" | "DELETE", body: Record<string, unknown> | undefined, success: string) {
    setBusy(true);
    try {
      const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
      if (!response.ok) { const result = await response.json().catch(() => ({})) as { error?: string }; throw new Error(result.error || "Request failed"); }
      await load(); toast.success(success); return true;
    } catch (error) { toast.error(error instanceof Error ? error.message : (tr ? "İşlem başarısız." : "Action failed.")); return false; }
    finally { setBusy(false); }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form) return;
    if (!form.category) { setFormError(tr ? "Bir kategori seç." : "Choose a category."); return; }
    const body = { kind: form.kind, type: form.type, title: form.title, amount: form.amount, category: form.category, account: form.account, frequency: form.frequency, startDate: form.startDate, endDate: form.endDate };
    const done = form.id
      ? await send(`/api/recurring/${form.id}`, "PATCH", body, tr ? "Güncellendi." : "Updated.")
      : await send("/api/recurring", "POST", body, tr ? "Eklendi." : "Added.");
    if (done) setForm(null);
  }

  const formCategories = (data?.categories ?? []).filter((category) => category.type === form?.type);

  function renderItem(item: Item) {
    const days = daysUntil(item.nextDate, todayLocal());
    const soon = item.active && item.kind === "subscription" && days >= 0 && days <= 7;
    return <li key={item.id} className="panel flex flex-wrap items-center gap-3" style={{ opacity: item.active ? 1 : 0.6 }}>
      <div className="min-w-0 flex-1">
        <b className="block truncate">{item.title}</b>
        <small className="text-[var(--c-t-66708b)]">
          {tr ? frequencyLabels[item.frequency].tr : frequencyLabels[item.frequency].en}
          {item.categoryName && ` · ${categoryDisplayName(item.categoryName, language)}`}
          {item.active ? ` · ${tr ? "Sonraki" : "Next"}: ${dateText(item.nextDate)}` : ` · ${tr ? "Duraklatıldı" : "Paused"}`}
        </small>
        {soon && <small className="block font-semibold text-[var(--c-t-b45309)]">{days === 0 ? (tr ? "Bugün yenileniyor" : "Renews today") : tr ? `${days} gün sonra yenileniyor` : `Renews in ${days} days`}</small>}
      </div>
      <b className={item.type === "income" ? "text-[var(--c-t-15803d)]" : ""}>{item.type === "income" ? "+" : "−"}{money(item.amount)}</b>
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" disabled={busy} aria-label={item.active ? (tr ? "Duraklat" : "Pause") : (tr ? "Devam ettir" : "Resume")} onClick={() => void send(`/api/recurring/${item.id}`, "PATCH", { active: !item.active }, item.active ? (tr ? "Duraklatıldı." : "Paused.") : (tr ? "Devam ediyor." : "Resumed."))}>{item.active ? <Pause /> : <Play />}</Button>
        <Button variant="ghost" size="icon" disabled={busy} aria-label={tr ? "Düzenle" : "Edit"} onClick={() => openEdit(item)}><Pencil /></Button>
        <Button variant="ghost" size="icon" disabled={busy} aria-label={tr ? "Sil" : "Delete"} onClick={() => { if (window.confirm(tr ? "Silinsin mi? Daha önce oluşan işlemler kalır." : "Delete this? Transactions it already created stay.")) void send(`/api/recurring/${item.id}`, "DELETE", undefined, tr ? "Silindi." : "Deleted."); }}><Trash2 /></Button>
      </div>
    </li>;
  }

  return <section className="recurring-page">
    <div className="page-head"><div><h2>{tr ? "Tekrarlayanlar" : "Recurring"}</h2><p>{tr ? "Kira, maaş, fatura ve abonelikler tarihi gelince kendiliğinden işlem olur." : "Rent, salary, bills and subscriptions become transactions on their own when they are due."}</p></div>
      <div className="flex gap-2"><Button variant="outline" disabled={loading || loadError || !data?.available} onClick={() => openNew("subscription")}><Plus />{tr ? "Abonelik" : "Subscription"}</Button><Button disabled={loading || loadError || !data?.available} onClick={() => openNew("regular")}><Plus />{tr ? "Tekrarlayan işlem" : "Recurring item"}</Button></div></div>

    {loadError && <p role="alert" className="form-error">{tr ? "Yüklenemedi. Sayfayı yenileyip tekrar deneyin." : "Unable to load. Please refresh."}</p>}
    {loading ? <div className="panel">{tr ? "Yükleniyor…" : "Loading…"}</div> : loadError ? null : !data?.available ? <div className="panel empty-accounts"><Repeat /><h3>{tr ? "Bu özellik henüz hazır değil" : "This feature is not ready yet"}</h3><p>{tr ? "Kısa süre içinde kullanıma açılacak." : "It will be available shortly."}</p></div> : <>
      {items.length === 0 && <div className="panel empty-accounts"><Repeat /><h3>{tr ? "Henüz tekrarlayan işlem yok" : "No recurring items yet"}</h3><p>{tr ? "Kira, maaş ya da Netflix gibi bir abonelik ekle; tarihi gelince işlem olarak kaydedilir." : "Add rent, a salary or a subscription like Netflix; it is recorded as a transaction when it is due."}</p></div>}

      <h3 className="mt-4 text-base font-semibold">{tr ? "Abonelikler" : "Subscriptions"}{subscriptions.length > 0 && <small className="ml-2 font-normal text-[var(--c-t-66708b)]">{tr ? "Aylık toplam" : "Monthly total"}: {money(subscriptionTotal)} · {tr ? "Yıllık" : "Yearly"}: {money(subscriptionTotal * 12)}</small>}</h3>
      <div className="my-2 flex flex-wrap gap-2" aria-label={tr ? "Hızlı ekle" : "Quick add"}>{subscriptionPresets.map((name) => <Button key={name} variant="outline" size="sm" onClick={() => openNew("subscription", name)}>{name}</Button>)}</div>
      {subscriptions.length > 0 && <ul className="grid gap-2">{subscriptions.map(renderItem)}</ul>}

      <h3 className="mt-6 text-base font-semibold">{tr ? "Düzenli gelir ve giderler" : "Regular income and expenses"}</h3>
      {regular.length === 0 ? <p className="text-sm text-[var(--c-t-66708b)]">{tr ? "Kira, maaş, fatura gibi düzenli işlemlerini buraya ekle." : "Add rent, salary, bills and similar items here."}</p> : <ul className="grid gap-2">{regular.map(renderItem)}</ul>}
    </>}

    <Dialog open={form !== null} onOpenChange={(open) => { if (!open) setForm(null); }}>
      <DialogContent><DialogHeader><DialogTitle>{form?.id ? (tr ? "Düzenle" : "Edit") : form?.kind === "subscription" ? (tr ? "Yeni abonelik" : "New subscription") : (tr ? "Yeni tekrarlayan işlem" : "New recurring item")}</DialogTitle><DialogDescription>{tr ? "Geçmiş tarihler için işlem oluşturulmaz; ilk kayıt bugünden sonraki ilk tarihte yapılır." : "No transactions are created for past dates; the first one is recorded on the first date from today on."}</DialogDescription></DialogHeader>
        {form && <form className="grid gap-4 sm:grid-cols-2" onSubmit={(event) => void submit(event)}>
          {form.kind === "regular" && <fieldset className="transaction-type-picker sm:col-span-2"><legend>{tr ? "Tür" : "Type"}</legend>{(["expense", "income"] as const).map((value) => <button type="button" key={value} aria-pressed={form.type === value} className={`${value} ${form.type === value ? "active" : ""}`} onClick={() => setForm({ ...form, type: value, category: form.type === value ? form.category : "" })}><i>{value === "expense" ? <Minus /> : <Plus />}</i><span><strong>{value === "expense" ? (tr ? "Gider" : "Expense") : (tr ? "Gelir" : "Income")}</strong><small>{value === "expense" ? (tr ? "Kira, fatura…" : "Rent, bill…") : (tr ? "Maaş, kira geliri…" : "Salary, rent income…")}</small></span></button>)}</fieldset>}
          <label className="grid gap-1 text-sm font-semibold sm:col-span-2"><span className="field-label">{tr ? "Ad" : "Name"}<RequiredMark /></span><Input value={form.title} minLength={2} maxLength={120} required onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder={form.kind === "subscription" ? "Netflix" : (tr ? "Örn. Ev kirası" : "E.g. Apartment rent")} /></label>
          <label className="grid gap-1 text-sm font-semibold"><span className="field-label">{tr ? "Tutar" : "Amount"}<RequiredMark /></span><Input type="number" inputMode="decimal" min="0.01" step="0.01" required value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></label>
          <label className="grid gap-1 text-sm font-semibold"><span className="field-label">{tr ? "Ne sıklıkla?" : "How often?"}<RequiredMark /></span><select className={selectClass} value={form.frequency} onChange={(event) => setForm({ ...form, frequency: event.target.value as Frequency })}>{(Object.keys(frequencyLabels) as Frequency[]).map((value) => <option key={value} value={value}>{tr ? frequencyLabels[value].tr : frequencyLabels[value].en}</option>)}</select></label>
          <label className="grid gap-1 text-sm font-semibold"><span className="field-label">{tr ? "İlk / sonraki ödeme tarihi" : "First / next payment date"}<RequiredMark /></span><Input type="date" required value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} /></label>
          <label className="grid gap-1 text-sm font-semibold">{tr ? "Bitiş tarihi (isteğe bağlı)" : "End date (optional)"}<Input type="date" value={form.endDate} min={form.startDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} /></label>
          <label className="grid gap-1 text-sm font-semibold"><span className="field-label">{tr ? "Kategori" : "Category"}<RequiredMark /></span><select className={selectClass} value={form.category} required onChange={(event) => setForm({ ...form, category: event.target.value })}><option value="">{tr ? "Seç…" : "Choose…"}</option>{formCategories.map((category) => <option key={category.id} value={category.id}>{categoryDisplayName(category.name, language)}</option>)}</select></label>
          <label className="grid gap-1 text-sm font-semibold">{tr ? "Hesap (isteğe bağlı)" : "Account (optional)"}<select className={selectClass} value={form.account} onChange={(event) => setForm({ ...form, account: event.target.value })}><option value="">{tr ? "Hesap yok" : "No account"}</option>{(data?.accounts ?? []).map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
          {formError && <p role="alert" className="form-error sm:col-span-2">{formError}</p>}
          <Button type="submit" disabled={busy} className="sm:col-span-2">{form.id ? (tr ? "Kaydet" : "Save") : (tr ? "Ekle" : "Add")}</Button>
        </form>}
      </DialogContent>
    </Dialog>
  </section>;
}

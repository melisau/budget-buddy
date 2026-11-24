"use client";

import { useCallback, useContext, useEffect, useState } from "react";
import { Pencil, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { LanguageContext } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { RequiredMark } from "@/components/ui/required-mark";
import { formatCurrency } from "@/lib/finance/currency";
import { useFinanceDataVersion } from "@/lib/finance/data-events";
import type { Currency } from "@/types/finance";
import { localized, germanOr } from "@/lib/i18n/localized";

type Total = { available: boolean; limit: number | null; spent: number; income: number; usage: number; status: "safe" | "approaching" | "critical" | "exceeded"; currency: Currency };

/**
 * One overall spending limit for the whole month, above the per-category
 * budgets, with this month's total spending and income for context.
 */
export function TotalBudgetCard({ month }: { month: string }) {
  const { language } = useContext(LanguageContext);
  const tr = language === "tr";
  const version = useFinanceDataVersion();
  const [data, setData] = useState<Total | null>(null);
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/budgets/total?month=${month}`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      setData(await response.json() as Total);
      setFailed(false);
    } catch { setFailed(true); }
  }, [month]);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load, version]);

  if (failed) return <div className="panel total-budget"><p className="m-0 text-sm">{tr ? "Genel bütçe yüklenemedi." : localized("Unable to load the overall budget.")}</p></div>;
  if (!data) return <div className="panel total-budget" role="status"><p className="m-0 text-sm">{tr ? "Genel bütçe yükleniyor…" : localized("Loading the overall budget…")}</p></div>;
  if (!data.available) return null;

  const money = (value: number) => formatCurrency(value, data.currency, language);
  const open = (value?: number) => { setAmount(value ? String(value) : data.limit ? String(data.limit) : ""); setEditing(true); };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch("/api/budgets/total", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ month, amountLimit: amount }) });
      if (!response.ok) throw new Error();
      setData(await response.json() as Total);
      setEditing(false);
      toast.success(tr ? "Genel bütçe kaydedildi." : localized("Overall budget saved."));
    } catch { toast.error(tr ? "Genel bütçe kaydedilemedi." : localized("Unable to save the overall budget.")); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    if (!window.confirm(tr ? "Bu ayın genel bütçesi kaldırılsın mı? Kategori bütçeleri kalır." : localized("Remove this month's overall budget? Category budgets stay."))) return;
    setBusy(true);
    try {
      const response = await fetch("/api/budgets/total", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ month }) });
      if (!response.ok) throw new Error();
      await load();
    } catch { toast.error(tr ? "Kaldırılamadı." : localized("Unable to remove.")); }
    finally { setBusy(false); }
  };

  return <article className="panel total-budget">
    <div className="total-budget-head">
      <span className="total-budget-icon" aria-hidden="true"><Wallet /></span>
      <div className="min-w-0 flex-1">
        <h3>{tr ? "Genel aylık bütçe" : localized("Overall monthly budget")}</h3>
        <p>{tr ? "Bu ay tüm harcamaların için tek bir üst sınır. Kategori bütçeleri bunun içinde ayrıca takip edilir." : localized("One limit for all spending this month. Category budgets are tracked inside it.")}</p>
      </div>
      {data.limit !== null && <div className="flex gap-1"><Button variant="ghost" size="icon" disabled={busy} aria-label={tr ? "Genel bütçeyi düzenle" : localized("Edit overall budget")} onClick={() => open()}><Pencil /></Button><Button variant="ghost" size="icon" disabled={busy} aria-label={tr ? "Genel bütçeyi kaldır" : localized("Remove overall budget")} onClick={() => void remove()}><Trash2 /></Button></div>}
    </div>

    {data.limit === null
      ? <div className="total-budget-empty"><p>{tr ? `Bu ay ${money(data.income)} gelir, ${money(data.spent)} harcama var.` : germanOr(`Diesen Monat: ${money(data.income)} Einnahmen, ${money(data.spent)} Ausgaben.`, `This month: ${money(data.income)} income, ${money(data.spent)} spending.`)}</p><div className="flex flex-wrap gap-2"><Button onClick={() => open()}>{tr ? "Genel bütçe belirle" : localized("Set an overall budget")}</Button>{data.income > 0 && <Button variant="outline" onClick={() => open(Math.round(data.income))}>{tr ? `Gelirim kadar (${money(data.income)})` : germanOr(`So viel wie mein Einkommen (${money(data.income)})`, `Same as income (${money(data.income)})`)}</Button>}</div></div>
      : <>
        <div className="total-budget-numbers"><strong>{money(data.spent)}</strong><span>/ {money(data.limit)}</span><b className={data.status}>{data.limit - data.spent >= 0 ? (tr ? `${money(data.limit - data.spent)} kaldı` : germanOr(`${money(data.limit - data.spent)} übrig`, `${money(data.limit - data.spent)} left`)) : (tr ? `${money(data.spent - data.limit)} aşıldı` : germanOr(`${money(data.spent - data.limit)} überschritten`, `${money(data.spent - data.limit)} over`))}</b></div>
        <Progress value={Math.min(100, data.usage)} className={`total-budget-progress ${data.status}`} aria-label={tr ? `Genel bütçenin %${data.usage} kullanıldı` : germanOr(`${data.usage} % des Gesamtbudgets genutzt`, `${data.usage}% of the overall budget used`)} />
        <p className="total-budget-income">{tr ? `Bu ayki gelirin: ${money(data.income)}` : germanOr(`Einnahmen diesen Monat: ${money(data.income)}`, `Income this month: ${money(data.income)}`)}{data.income > 0 && data.limit > data.income ? (tr ? " · Bütçen gelirinden yüksek." : localized(" · Your budget is higher than your income.")) : ""}</p>
      </>}

    <Dialog open={editing} onOpenChange={setEditing}>
      <DialogContent>
        <DialogHeader><DialogTitle>{tr ? "Genel aylık bütçe" : localized("Overall monthly budget")}</DialogTitle><DialogDescription>{tr ? "Bu ay tüm kategorilerde en fazla ne kadar harcamak istiyorsun?" : localized("How much do you want to spend at most this month, across all categories?")}</DialogDescription></DialogHeader>
        <form className="grid gap-4" onSubmit={(event) => void save(event)}>
          <label className="grid gap-1 text-sm font-semibold"><span className="field-label">{tr ? "Aylık üst sınır" : localized("Monthly limit")}<RequiredMark /></span><Input type="number" inputMode="decimal" min="1" step="0.01" required value={amount} onChange={(event) => setAmount(event.target.value)} autoFocus /></label>
          {data.income > 0 && <Button type="button" variant="outline" onClick={() => setAmount(String(Math.round(data.income)))}>{tr ? `Gelirim kadar: ${money(data.income)}` : germanOr(`So viel wie mein Einkommen: ${money(data.income)}`, `Same as income: ${money(data.income)}`)}</Button>}
          <Button type="submit" disabled={busy || !(Number(amount) > 0)}>{busy ? "…" : tr ? "Kaydet" : localized("Save")}</Button>
        </form>
      </DialogContent>
    </Dialog>
  </article>;
}

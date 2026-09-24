"use client";

import { useContext, useEffect, useState } from "react";
import { PiggyBank } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LanguageContext } from "@/components/providers/language-provider";

export function AllowancePlan() {
  const { language } = useContext(LanguageContext); const tr = language === "tr";
  const [monthlyAmount, setMonthlyAmount] = useState("");
  const [savingsPercent, setSavingsPercent] = useState("20");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    void fetch("/api/allowance", { cache: "no-store" }).then(async (response) => { if (!response.ok) throw new Error(); return await response.json() as { plan: { monthly_amount: number; savings_percent: number } | null }; }).then(({ plan }) => { if (active && plan) { setMonthlyAmount(String(plan.monthly_amount)); setSavingsPercent(String(plan.savings_percent)); setSaved(true); } }).catch(() => { if (active) toast.error(tr ? "Harçlık planı yüklenemedi." : "Unable to load allowance plan."); });
    return () => { active = false; };
  }, [tr]);
  const amount = Number(monthlyAmount) || 0;
  const savings = amount * (Number(savingsPercent) || 0) / 100;
  const format = (value: number) => new Intl.NumberFormat(tr ? "tr-TR" : "en-US", { style: "currency", currency: "TRY" }).format(value);
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true);
    try {
      const response = await fetch("/api/allowance", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ monthlyAmount, savingsPercent }) });
      if (!response.ok) throw new Error();
      setSaved(true); toast.success(tr ? "Kişisel harçlık planın kaydedildi." : "Your private allowance plan was saved.");
    } catch { toast.error(tr ? "Harçlık planı kaydedilemedi." : "Unable to save allowance plan."); }
    finally { setBusy(false); }
  }
  return <article className="panel mb-5 grid gap-4 md:grid-cols-[1fr_auto]"><div><h3 className="m-0 flex items-center gap-2 text-lg font-bold"><PiggyBank className="text-[#5267df]" />{tr ? "Kişisel harçlık planım" : "My allowance plan"}</h3><p className="mt-1 text-sm text-[#737c91]">{tr ? "Ayda ne kadarını biriktirmek istediğini belirle. Bu plan aile grubunla paylaşılmaz; banka hesabı eklemek gerekmez." : "Set aside part of your monthly allowance. This stays private; no bank account needed."}</p></div>{saved && <span className="h-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{tr ? "Yalnızca sana özel" : "Private to you"}</span>}
    <form className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] md:col-span-2" onSubmit={(event) => void save(event)}><label className="grid gap-1 text-sm font-semibold">{tr ? "Aylık harçlık (₺)" : "Monthly allowance (₺)"}<Input type="number" min="1" step="0.01" max="1000000000" value={monthlyAmount} onChange={(event) => setMonthlyAmount(event.target.value)} required /></label><label className="grid gap-1 text-sm font-semibold">{tr ? "Birikim payı (%)" : "Savings share (%)"}<Input type="number" min="0" max="100" step="1" value={savingsPercent} onChange={(event) => setSavingsPercent(event.target.value)} required /></label><Button type="submit" disabled={busy || amount <= 0} className="self-end">{busy ? "…" : tr ? "Planı kaydet" : "Save plan"}</Button></form>
    {amount > 0 && <p className="m-0 rounded-xl bg-[#eef0ff] p-3 text-sm md:col-span-2">{tr ? "Her ay birikime" : "Save monthly"} <b>{format(savings)}</b> · {tr ? "kullanıma kalan" : "left to spend"} <b>{format(amount - savings)}</b></p>}
  </article>;
}

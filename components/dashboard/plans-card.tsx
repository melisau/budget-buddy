"use client";

import { useContext, useEffect, useState } from "react";
import Link from "next/link";
import { LanguageContext, useT } from "@/components/providers/language-provider";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/finance/currency";
import { useFinanceDataVersion } from "@/lib/finance/data-events";
import type { Currency } from "@/types/finance";

type Budget = { id: string; categoryName: string; limit: number; spent: number; usage: number; status: "safe" | "approaching" | "critical" | "exceeded" };
type Goal = { id: string; name: string; target_amount: number; current_amount: number; deadline: string | null };
type Tab = "budgets" | "goals";
const TAB_KEY = "budgetbuddy-dashboard-plans";

/** Dashboard card that shows either this month's budgets or the savings goals; the choice is remembered. */
export function PlansCard({ month }: { month: string }) {
  const t = useT();
  const { language } = useContext(LanguageContext);
  const tr = language === "tr";
  const version = useFinanceDataVersion();
  const [tab, setTab] = useState<Tab>("budgets");
  const [budgets, setBudgets] = useState<{ items: Budget[]; currency: Currency } | null>(null);
  const [goals, setGoals] = useState<{ items: Goal[]; currency: Currency } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { const saved = window.localStorage.getItem(TAB_KEY); if (saved === "budgets" || saved === "goals") setTab(saved); } catch { /* storage may be blocked */ }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        if (tab === "budgets") {
          const response = await fetch(`/api/budgets?month=${month}`, { cache: "no-store", signal: controller.signal });
          if (!response.ok) throw new Error();
          const data = await response.json() as { budgets: Budget[]; currency: Currency };
          setBudgets({ items: data.budgets, currency: data.currency });
        } else {
          const response = await fetch("/api/goals", { cache: "no-store", signal: controller.signal });
          if (!response.ok) throw new Error();
          const data = await response.json() as { goals: Goal[]; currency: Currency };
          setGoals({ items: data.goals, currency: data.currency });
        }
        setFailed(false);
      } catch (error) { if (!(error instanceof DOMException && error.name === "AbortError")) setFailed(true); }
    };
    void load();
    return () => controller.abort();
  }, [tab, month, version]);

  const choose = (next: Tab) => { setTab(next); try { window.localStorage.setItem(TAB_KEY, next); } catch { /* ignore */ } };
  const money = (value: number, currency: Currency) => formatCurrency(value, currency, language);
  const loaded = tab === "budgets" ? budgets : goals;

  return <article className="panel dashboard-plans">
    <div className="panel-head">
      <div><h3>{tab === "budgets" ? (tr ? "Bütçeler" : "Budgets") : (tr ? "Hedefler" : "Goals")}</h3><p>{tab === "budgets" ? (tr ? "Bu ayki harcama sınırların" : "Your spending limits this month") : (tr ? "Biriktirdiklerin" : "What you are saving for")}</p></div>
      <div className="plans-switch" role="tablist" aria-label={tr ? "Gösterilecek" : "Show"}>
        {(["budgets", "goals"] as const).map((id) => <button type="button" role="tab" key={id} aria-selected={tab === id} className={tab === id ? "active" : ""} onClick={() => choose(id)}>{id === "budgets" ? (tr ? "Bütçeler" : "Budgets") : (tr ? "Hedefler" : "Goals")}</button>)}
      </div>
    </div>
    {failed ? <p className="empty-state">{tr ? "Yüklenemedi." : "Unable to load."}</p>
      : !loaded ? <p className="empty-state" role="status">{tr ? "Yükleniyor…" : "Loading…"}</p>
      : tab === "budgets" ? (budgets!.items.length
        ? budgets!.items.slice(0, 4).map((budget) => <div className="plans-row" key={budget.id}><div><b>{t(budget.categoryName)}</b><span>{money(budget.spent, budgets!.currency)} / {money(budget.limit, budgets!.currency)}</span></div><Progress value={Math.min(100, budget.usage)} className={budget.status} /></div>)
        : <p className="empty-state">{tr ? "Bu ay için bütçe yok." : "No budgets this month."} <Link href="/budgets">{tr ? "Bütçe oluştur" : "Create a budget"}</Link></p>)
      : (goals!.items.length
        ? goals!.items.slice(0, 4).map((goal) => { const percent = goal.target_amount > 0 ? Math.min(100, Math.round((Number(goal.current_amount) / Number(goal.target_amount)) * 100)) : 0; return <div className="plans-row" key={goal.id}><div><b>{goal.name}</b><span>{money(Number(goal.current_amount), goals!.currency)} / {money(Number(goal.target_amount), goals!.currency)} · %{percent}</span></div><Progress value={percent} /></div>; })
        : <p className="empty-state">{tr ? "Henüz hedef yok." : "No goals yet."} <Link href="/goals">{tr ? "Hedef oluştur" : "Create a goal"}</Link></p>)}
    {loaded && <Link className="plans-more" href={tab === "budgets" ? "/budgets" : "/goals"}>{tr ? "Tümünü gör" : "View all"}</Link>}
  </article>;
}

"use client";

import { useContext, useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrendingUp } from "lucide-react";
import { LanguageContext, useT } from "@/components/providers/language-provider";
import { formatCurrency } from "@/lib/finance/currency";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import type { Currency } from "@/types/finance";

type Budget = { id: string; categoryName: string; spent: number; limit: number; usage: number; status: "safe" | "approaching" | "critical" | "exceeded" };
type AnalyticsData = { filters: { month: string; period: number; scope: string; accountId: string; currency: Currency; budgetCurrency: Currency; accounts: { id: string; name: string; currency: Currency }[]; familyGroups: { id: string; name: string }[]; currencies: Currency[] }; summary: { income: number; expenses: number; savingsRate: number }; monthly: { month: string; income: number; expense: number }[]; largest: { id: string; title: string; category: string; amount: number; date: string }[]; budgets: Budget[] };
const currentMonth = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", timeZone: "Europe/Istanbul" }).format(new Date());
const statusClass = { safe: "green", approaching: "amber", critical: "amber", exceeded: "red" };

export function AnalyticsScreen() {
  const t = useT(); const { language } = useContext(LanguageContext); const tr = language === "tr"; const locale = tr ? "tr-TR" : "en-US";
  const [period, setPeriod] = useState("6"); const [month, setMonth] = useState(currentMonth); const [scope, setScope] = useState("personal"); const [accountId, setAccountId] = useState("all"); const [currency, setCurrency] = useState<Currency>("TRY");
  const [data, setData] = useState<AnalyticsData | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  useEffect(() => { const controller = new AbortController(); const params = new URLSearchParams({ period, month, scope, account: accountId, currency }); void fetch(`/api/analytics?${params}`, { cache: "no-store", signal: controller.signal }).then(async (response) => { const payload = await response.json() as AnalyticsData & { error?: string }; if (!response.ok) throw new Error(payload.error); setData(payload); setError(null); if (payload.filters.accountId !== accountId) setAccountId(payload.filters.accountId); if (payload.filters.currency !== currency) setCurrency(payload.filters.currency); }).catch((reason) => { if (!(reason instanceof DOMException && reason.name === "AbortError")) setError(tr ? "Analizler yüklenemedi." : (reason instanceof Error ? reason.message : "Unable to load analytics.")); }).finally(() => { if (!controller.signal.aborted) setLoading(false); }); return () => controller.abort(); }, [accountId, currency, month, period, scope, tr]);
  const money = (value: number) => formatCurrency(value, data?.filters.currency ?? currency, language);
  const monthly = useMemo(() => (data?.monthly ?? []).map((item) => ({ ...item, label: new Intl.DateTimeFormat(locale, { month: "short", year: Number(period) > 6 ? "2-digit" : undefined, timeZone: "UTC" }).format(new Date(`${item.month}-01T00:00:00Z`)) })), [data?.monthly, locale, period]);
  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`));

  return <>
    <div className="page-head"><div><h2>{t("Your financial patterns")}</h2><p>{t("Focus on trends that help you make better decisions.")}</p></div></div>
    <div className="analytics-filters panel">
      <label><span>{t("Period")}</span><Select value={period} onValueChange={setPeriod}><SelectTrigger aria-label={t("Select period")}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">{t("This month")}</SelectItem><SelectItem value="3">{t("3 months")}</SelectItem><SelectItem value="6">{t("6 months")}</SelectItem><SelectItem value="12">{t("1 year")}</SelectItem></SelectContent></Select></label>
      <label><span>{tr ? "Bitiş ayı" : "End month"}</span><Input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label>
      <label><span>{t("Scope")}</span><Select value={scope} onValueChange={(value) => { setScope(value); setAccountId("all"); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="personal">{t("Personal")}</SelectItem>{data?.filters.familyGroups.map((group) => <SelectItem value={`family:${group.id}`} key={group.id}>{group.name}</SelectItem>)}</SelectContent></Select></label>
      <label><span>{t("Account")}</span><Select value={accountId} onValueChange={(value) => { setAccountId(value); const selected = data?.filters.accounts.find((account) => account.id === value); if (selected) setCurrency(selected.currency); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{t("All accounts")}</SelectItem>{data?.filters.accounts.map((account) => <SelectItem value={account.id} key={account.id}>{t(account.name)} · {account.currency}</SelectItem>)}</SelectContent></Select></label>
      <label><span>{t("Currency")}</span><Select value={currency} disabled={accountId !== "all"} onValueChange={(value) => setCurrency(value as Currency)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{(data?.filters.currencies ?? ["TRY", "EUR", "USD", "GBP"]).map((item) => <SelectItem value={item} key={item}>{item}</SelectItem>)}</SelectContent></Select></label>
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}
    {loading && !data ? <div className="panel">{t("Loading analytics…")}</div> : <div className="analytics">
      <article className="panel analytics-chart"><div className="panel-head"><div><h3>{t("Income vs expense")}</h3><p>{tr ? `Son ${period} aylık gerçek nakit akışı` : `Actual cash flow for the last ${period} month${period === "1" ? "" : "s"}`}</p></div></div><div className="chart"><ResponsiveContainer><AreaChart data={monthly}><CartesianGrid vertical={false} /><XAxis dataKey="label" /><YAxis /><Tooltip formatter={(value) => money(Number(value))} /><Area dataKey="income" name={t("Income")} stroke="#249779" fill="#24977922" /><Area dataKey="expense" name={t("Expenses")} stroke="#f18470" fill="#f1847018" /></AreaChart></ResponsiveContainer></div></article>
      <article className="panel rate"><TrendingUp /><span>{t("Savings rate")}</span><strong>{(data?.summary.savingsRate ?? 0).toFixed(1)}%</strong><p>{data?.summary.income ? (tr ? `${money(data.summary.income - data.summary.expenses)} bu ay biriktirildi` : `${money(data.summary.income - data.summary.expenses)} saved this month`) : t("Add income to calculate your savings rate.")}</p></article>
      <article className="panel"><div className="panel-head"><div><h3>{t("Largest expenses")}</h3><p>{monthLabel}</p></div></div>{data?.largest.length ? data.largest.map((item, index) => <div className="rank" key={item.id}><b>{index + 1}</b><span>{item.title}<small>{t(item.category)} · {new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(`${item.date}T00:00:00Z`))}</small></span><strong>{money(item.amount)}</strong></div>) : <p className="empty-state">{t("No expenses this month.")}</p>}</article>
      <article className="panel"><div className="panel-head"><div><h3>{t("Budget performance")}</h3><p>{monthLabel}</p></div></div>{scope === "personal" ? data?.budgets.length ? data.budgets.map((budget) => <div className="budget-row" key={budget.id}><div><b>{t(budget.categoryName)}</b><span>{money(budget.spent)} / {money(budget.limit)}</span></div><Progress value={Math.min(100, budget.usage)} /><small className={statusClass[budget.status]}>{budget.status === "exceeded" ? t("Limit exceeded") : (tr ? `%${budget.usage} kullanıldı` : `${budget.usage}% used`)}</small><strong>{budget.usage}%</strong></div>) : <p className="empty-state">{data?.filters.budgetCurrency !== data?.filters.currency ? (tr ? `Bütçeler ${data?.filters.budgetCurrency} para biriminde takip ediliyor.` : `Budgets are tracked in ${data?.filters.budgetCurrency}.`) : t("Create a budget to track it here.")}</p> : <p className="empty-state">{tr ? "Aile görünümünde ortak bütçe bulunmuyor." : "Shared family budgets are not configured."}</p>}</article>
    </div>}
  </>;
}

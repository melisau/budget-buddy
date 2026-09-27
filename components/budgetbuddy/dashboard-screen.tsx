"use client";

import Link from "next/link";
import { useContext, useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, PiggyBank, WalletCards } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/finance/currency";
import type { Navigate } from "@/components/budgetbuddy/view-types";
import { LanguageContext, useT } from "@/components/providers/language-provider";
import type { Currency } from "@/types/finance";

type DashboardData = {
  hasGoals: boolean;
  filters: { month: string; scope: string; accountId: string; currency: Currency; accounts: { id: string; name: string; currency: Currency }[]; familyGroups: { id: string; name: string }[]; currencies: Currency[] };
  summary: { balance: number; income: number; expenses: number; savingsRate: number };
  categories: { name: string; value: number }[];
  recent: { id: string; title: string; type: "income" | "expense"; amount: number; transaction_date: string; category: { name: string } | { name: string }[] | null }[];
  cashFlow: { month: string; income: number; expense: number }[];
};

const Stat = ({ name, value, Icon }: { name: string; value: string; Icon: typeof WalletCards }) => <article className="stat"><i><Icon /></i><span>{name}</span><strong>{value}</strong></article>;
const currentMonth = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", timeZone: "Europe/Istanbul" }).format(new Date());

export function DashboardScreen({ go }: { go: Navigate }) {
  const t = useT();
  const { language } = useContext(LanguageContext);
  const [month, setMonth] = useState(currentMonth);
  const [scope, setScope] = useState("personal");
  const [accountId, setAccountId] = useState("all");
  const [currency, setCurrency] = useState<Currency>("TRY");
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const locale = language === "tr" ? "tr-TR" : "en-US";
  const months = useMemo(() => Array.from({ length: 18 }, (_, index) => { const [year, number] = currentMonth.split("-").map(Number); const date = new Date(Date.UTC(year, number - 1 - index, 1)); return { value: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`, label: new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(date) }; }), [locale]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ month, scope, account: accountId, currency });
    void fetch(`/api/dashboard?${params}`, { cache: "no-store", signal: controller.signal }).then(async (response) => {
      const payload = await response.json() as DashboardData & { error?: string };
      if (!response.ok) throw new Error(payload.error);
      setError("");
      setData(payload);
      if (payload.filters.accountId !== accountId) setAccountId(payload.filters.accountId);
      if (payload.filters.currency !== currency) setCurrency(payload.filters.currency);
    }).catch((reason) => { if (!(reason instanceof DOMException && reason.name === "AbortError")) setError(reason instanceof Error ? reason.message : "Unable to load your dashboard."); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [accountId, currency, month, scope]);

  if (loading && !data) return <DashboardSkeleton />;
  const money = (amount: number) => formatCurrency(amount, data?.filters.currency ?? currency);
  const monthLabel = months.find((item) => item.value === month)?.label ?? month;
  const chartData = (data?.cashFlow ?? []).map((item) => ({ ...item, label: new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" }).format(new Date(`${item.month}-01T00:00:00Z`)) }));

  return <>
    {data && !data.hasGoals && data.filters.accounts.length === 0 && data.recent.length === 0 && <div className="mb-5 rounded-2xl bg-gradient-to-r from-[#172340] to-[#344d99] p-6 text-white sm:p-8"><span className="text-xs font-bold uppercase tracking-widest text-[#b9c5ff]">{language === "tr" ? "İlk adım" : "First step"}</span><h2 className="mt-2 text-2xl font-bold">{language === "tr" ? "İlk hedefinle başla" : "Start with your first goal"}</h2><p className="mt-2 max-w-xl text-sm leading-6 text-[#d7dff3]">{language === "tr" ? "Banka hesabı bağlamana veya eski harcamalarını girmene gerek yok. Bir hedef seç, tutarını yaz ve ilerlemeni takip et." : "No bank account or past spending required. Pick a goal and start tracking progress."}</p><Link href="/goals?create=1" className="mt-5 inline-flex rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-[#263b8f] hover:bg-[#eef0ff]">{language === "tr" ? "Hedefimi oluştur" : "Create my goal"}</Link></div>}
    <div className="dashboard-filters panel" aria-label={t("Dashboard filters")}>
      <label><span>{t("Month")}</span><Select value={month} onValueChange={setMonth}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{months.map((item) => <SelectItem value={item.value} key={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></label>
      <label><span>{t("Scope")}</span><Select value={scope} onValueChange={(value) => { setScope(value); setAccountId("all"); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="personal">{t("Personal")}</SelectItem>{data?.filters.familyGroups.map((group) => <SelectItem value={`family:${group.id}`} key={group.id}>{group.name}</SelectItem>)}</SelectContent></Select></label>
      <label><span>{t("Account")}</span><Select value={accountId} onValueChange={(value) => { setAccountId(value); const selected = data?.filters.accounts.find((item) => item.id === value); if (selected) setCurrency(selected.currency); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{t("All accounts")}</SelectItem>{data?.filters.accounts.map((account) => <SelectItem value={account.id} key={account.id}>{t(account.name)} · {account.currency}</SelectItem>)}</SelectContent></Select></label>
      <label><span>{t("Currency")}</span><Select value={currency} disabled={accountId !== "all"} onValueChange={(value) => setCurrency(value as Currency)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{(data?.filters.currencies ?? ["TRY", "EUR", "USD", "GBP"]).map((item) => <SelectItem value={item} key={item}>{item}</SelectItem>)}</SelectContent></Select></label>
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className={`dashboard-results ${loading ? "loading" : ""}`} aria-busy={loading} aria-live="polite">
      <div className="stats"><Stat name={t("Total balance")} value={money(data?.summary.balance ?? 0)} Icon={WalletCards} /><Stat name={t("Monthly income")} value={money(data?.summary.income ?? 0)} Icon={ArrowUpRight} /><Stat name={t("Monthly expenses")} value={money(data?.summary.expenses ?? 0)} Icon={ArrowDownRight} /><Stat name={t("Savings rate")} value={`${(data?.summary.savingsRate ?? 0).toFixed(1)}%`} Icon={PiggyBank} /></div>
      <div className="dash">
        <article className="panel dashboard-cashflow"><div className="panel-head"><div><h3>{t("Cash flow")}</h3><p>{t("Income and expenses · Last 6 months")}</p></div></div><div className="chart" role="img" aria-label={language === "tr" ? "Son altı ayın gelir ve gider grafiği" : "Income and expenses chart for the last six months"}><ResponsiveContainer><AreaChart data={chartData}><CartesianGrid vertical={false} /><XAxis dataKey="label" /><YAxis /><Tooltip formatter={(value) => money(Number(value))} /><Area dataKey="income" name={t("Income")} stroke="#249779" fill="#24977922" /><Area dataKey="expense" name={t("Expenses")} stroke="#f18470" fill="#f1847018" /></AreaChart></ResponsiveContainer></div><ul className="sr-only">{chartData.map((item) => <li key={item.month}>{item.label}: {t("Income")} {money(item.income)}, {t("Expenses")} {money(item.expense)}</li>)}</ul></article>
        <article className="panel"><div className="panel-head"><div><h3>{t("Spending by category")}</h3><p>{monthLabel}</p></div></div><div className="live-list">{data?.categories.length ? data.categories.map((item, index) => <div key={item.name}><i style={{ background: ["#5267df", "#249779", "#f18470", "#d7a33c"][index % 4] }} />{t(item.name)}<b>{money(item.value)}</b></div>) : <p>{t("No expenses this month.")}</p>}</div></article>
        <article className="panel dashboard-recent"><div className="panel-head"><div><h3>{t("Recent transactions")}</h3><p>{monthLabel}</p></div><button type="button" onClick={() => go("transactions")}>{t("View all")}</button></div><div className="live-list">{data?.recent.length ? data.recent.map((item) => { const category = Array.isArray(item.category) ? item.category[0] : item.category; return <div key={item.id}><span><b>{item.title}</b><small>{t(category?.name ?? "Uncategorized")} · {item.transaction_date}</small></span><b className={item.type === "income" ? "pos" : "neg"}>{item.type === "income" ? "+" : "−"}{money(item.amount)}</b></div>; }) : <p>{language === "tr" ? "Bu filtrelerde işlem yok." : "No transactions match these filters."}</p>}</div></article>
      </div>
    </div>
  </>;
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrendingUp } from "lucide-react";
import { PanelHead } from "@/components/budgetbuddy/shared";
import { useT } from "@/components/providers/language-provider";
import { formatNumber } from "@/lib/finance/currency";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

type Transaction = { id: string; title: string; category: string; transactionDate: string; amount: number; type: "income" | "expense" };
type Budget = { id: string; categoryName: string; spent: number; limit: number; usage: number; status: "safe" | "approaching" | "critical" | "exceeded" };
const statusClass = { safe: "green", approaching: "amber", critical: "amber", exceeded: "red" };

export function AnalyticsScreen() {
  const t = useT();
  const [period, setPeriod] = useState("6");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.resolve().then(async () => {
      try {
        const [transactionResponse, budgetResponse] = await Promise.all([fetch("/api/transactions", { cache: "no-store" }), fetch("/api/budgets", { cache: "no-store" })]);
        const transactionData = await transactionResponse.json() as { transactions?: Transaction[]; error?: string };
        const budgetData = await budgetResponse.json() as { budgets?: Budget[]; error?: string };
        if (!transactionResponse.ok) throw new Error(transactionData.error ?? "Unable to load transactions.");
        if (!budgetResponse.ok) throw new Error(budgetData.error ?? "Unable to load budgets.");
        setTransactions(transactionData.transactions ?? []); setBudgets(budgetData.budgets ?? []);
      } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Unable to load analytics."); } finally { setLoading(false); }
    });
  }, []);

  const monthly = useMemo(() => {
    const count = Number(period); const now = new Date();
    return Array.from({ length: count }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (count - index - 1), 1); const key = date.toISOString().slice(0, 7);
      const inMonth = transactions.filter((transaction) => transaction.transactionDate.startsWith(key));
      return { m: new Intl.DateTimeFormat(undefined, { month: "short" }).format(date), income: inMonth.filter((item) => item.type === "income").reduce((total, item) => total + item.amount, 0), expense: inMonth.filter((item) => item.type === "expense").reduce((total, item) => total + item.amount, 0) };
    });
  }, [period, transactions]);
  const current = monthly.at(-1) ?? { income: 0, expense: 0 }; const savingsRate = current.income ? Math.max(0, ((current.income - current.expense) / current.income) * 100) : 0;
  const largest = transactions.filter((item) => item.type === "expense" && item.transactionDate.startsWith(new Date().toISOString().slice(0, 7))).sort((a, b) => b.amount - a.amount).slice(0, 5);

  return <><div className="page-head"><div><h2>{t("Your financial patterns")}</h2><p>{t("Focus on trends that help you make better decisions.")}</p></div><Select value={period} onValueChange={setPeriod}><SelectTrigger aria-label={t("Select period")}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">{t("This month")}</SelectItem><SelectItem value="3">{t("3 months")}</SelectItem><SelectItem value="6">{t("6 months")}</SelectItem><SelectItem value="12">{t("1 year")}</SelectItem></SelectContent></Select></div>{error && <p className="form-error">{error}</p>}{loading ? <div className="panel">Loading analytics…</div> : <div className="analytics"><article className="panel analytics-chart"><PanelHead title="Income vs expense" sub={`Last ${period} month${period === "1" ? "" : "s"}`} /><div className="chart"><ResponsiveContainer><AreaChart data={monthly}><CartesianGrid vertical={false} /><XAxis dataKey="m" /><YAxis /><Tooltip /><Area dataKey="income" stroke="#5267df" fill="#5267df22" /><Area dataKey="expense" stroke="#f18470" fill="#f1847018" /></AreaChart></ResponsiveContainer></div></article><article className="panel rate"><TrendingUp /><span>{t("Savings rate")}</span><strong>{savingsRate.toFixed(1)}%</strong><p>{current.income ? `${formatNumber(current.income - current.expense, "en")} saved this month` : "Add income to calculate your savings rate."}</p></article><article className="panel"><PanelHead title="Largest expenses" sub="This month" />{largest.length ? largest.map((item, index) => <div className="rank" key={item.id}><b>{index + 1}</b><span>{item.title}<small>{item.category}</small></span><strong>₺{formatNumber(item.amount, "en")}</strong></div>) : <p className="empty-state">No expenses this month.</p>}</article><article className="panel"><PanelHead title="Budget performance" sub="Current limits" />{budgets.length ? budgets.map((budget) => <div className="budget-row" key={budget.id}><div><b>{budget.categoryName}</b><span>₺{formatNumber(budget.spent, "en")} / ₺{formatNumber(budget.limit, "en")}</span></div><Progress value={Math.min(100, budget.usage)} /><small className={statusClass[budget.status]}>{budget.status === "exceeded" ? "Limit exceeded" : `${budget.usage}% used`}</small><strong>{budget.usage}%</strong></div>) : <p className="empty-state">Create a budget to track it here.</p>}</article></div>}</>;
}

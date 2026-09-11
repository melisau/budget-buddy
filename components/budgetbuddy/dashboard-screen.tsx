"use client";

import { useContext, useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownRight, ArrowRight, ArrowUpRight, MoreHorizontal, PiggyBank, Sparkles, WalletCards, type LucideIcon } from "lucide-react";
import { BudgetRow, PanelHead, Transaction } from "@/components/budgetbuddy/shared";
import { cashFlow, demoBudgets, demoTransactions, spendingCategories } from "@/components/budgetbuddy/demo-data";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { EmptyDashboard } from "@/components/dashboard/empty-dashboard";
import { LanguageContext, useT } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import type { Navigate } from "@/components/budgetbuddy/view-types";

function Stat({ name, value, delta, icon: Icon, tone }: { name: string; value: string; delta: string; icon: LucideIcon; tone: string }) {
  const t = useT();
  const { language } = useContext(LanguageContext);
  return <article className="stat"><i className={tone}><Icon /></i><span>{t(name)}<MoreHorizontal /></span><strong>{value}</strong><p className="up">{delta} <small>{language === "tr" ? "geçen aya göre" : "vs last month"}</small></p></article>;
}

export function DashboardScreen({ go }: { go: Navigate }) {
  const t = useT();
  const { language } = useContext(LanguageContext);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsLoading(false), 260);
    return () => window.clearTimeout(timer);
  }, []);

  if (isLoading) return <DashboardSkeleton />;
  if (!demoTransactions.length) return <EmptyDashboard language={language} onAddTransaction={() => go("transactions")} />;

  return <>
    <div className="stats">
      <Stat name="Total balance" value="₺82,600" delta="+8.6%" icon={WalletCards} tone="blue" />
      <Stat name="Monthly income" value="₺55,000" delta="+7.8%" icon={ArrowUpRight} tone="green" />
      <Stat name="Monthly expenses" value="₺30,700" delta="↓ 9.7%" icon={ArrowDownRight} tone="coral" />
      <Stat name="Savings rate" value="44.2%" delta="+4.9%" icon={PiggyBank} tone="amber" />
    </div>
    <div className="dash">
      <article className="panel cash">
        <PanelHead title="Cash flow" sub="Income and expenses · Last 6 months" />
        <div className="chart"><ResponsiveContainer><AreaChart data={cashFlow}><CartesianGrid vertical={false} strokeDasharray="3 3" /><XAxis dataKey="m" tickFormatter={(value: string) => t(value)} /><YAxis /><Tooltip /><Area type="monotone" dataKey="income" stroke="#5267df" fill="#5267df22" strokeWidth={3} /><Area type="monotone" dataKey="expense" stroke="#f18470" fill="transparent" strokeWidth={2} /></AreaChart></ResponsiveContainer></div>
      </article>
      <article className="panel spend">
        <PanelHead title="Spending by category" sub="September" />
        <div className="donut">
          <div><ResponsiveContainer><PieChart><Pie data={spendingCategories.map((category) => ({ name: t(category[0]), value: category[1] }))} dataKey="value" innerRadius={58} outerRadius={78} paddingAngle={3}>{spendingCategories.map((category) => <Cell key={category[0]} fill={category[2]} />)}</Pie></PieChart></ResponsiveContainer><span>{t("Spent")}<b>₺30,700</b></span></div>
          <ul>{spendingCategories.slice(0, 5).map((category) => <li key={category[0]}><i style={{ background: category[2] }} />{t(category[0])}<b>₺{category[1].toLocaleString()}</b></li>)}</ul>
        </div>
      </article>
      <article className="panel"><PanelHead title="Budget progress" sub="3 of 4 budgets on track" action="View all" onClick={() => go("budgets")} />{demoBudgets.slice(0, 3).map((budget) => <BudgetRow budget={budget} key={budget[0]} />)}</article>
      <article className="panel"><PanelHead title="Recent transactions" sub="Latest activity" action="View all" onClick={() => go("transactions")} />{demoTransactions.slice(0, 4).map((transaction) => <Transaction transaction={transaction} key={transaction[0]} />)}</article>
      <article className="insight"><Sparkles /><div><span>{t("BUDGETBUDDY INSIGHT")}</span><h3>{t("Your food budget needs a small adjustment.")}</h3><p>{t("Restaurant spending is 24% higher. Reducing dining expenses by ₺800 would keep your food budget on track.")}</p><Button variant="secondary" onClick={() => go("assistant")}>{t("Ask BudgetBuddy")}</Button><button type="button" onClick={() => go("analytics")}>{t("View analysis")} <ArrowRight /></button></div><strong>81%<small>{t("Food budget used")}</small></strong></article>
    </div>
  </>;
}

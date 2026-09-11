"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrendingUp } from "lucide-react";
import { cashFlow, demoBudgets, demoTransactions } from "@/components/budgetbuddy/demo-data";
import { BudgetRow, PanelHead } from "@/components/budgetbuddy/shared";
import { useT } from "@/components/providers/language-provider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function AnalyticsScreen() {
  const t = useT();
  return <>
    <div className="page-head">
      <div><h2>{t("Your financial patterns")}</h2><p>{t("Focus on trends that help you make better decisions.")}</p></div>
      <Select defaultValue="6"><SelectTrigger aria-label={t("Select period")}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">{t("This month")}</SelectItem><SelectItem value="3">{t("3 months")}</SelectItem><SelectItem value="6">{t("6 months")}</SelectItem><SelectItem value="12">{t("1 year")}</SelectItem></SelectContent></Select>
    </div>
    <div className="analytics">
      <article className="panel analytics-chart">
        <PanelHead title="Income vs expense" sub="Last 6 months" />
        <div className="chart"><ResponsiveContainer><AreaChart data={cashFlow}><CartesianGrid vertical={false} /><XAxis dataKey="m" tickFormatter={(value: string) => t(value)} /><YAxis /><Tooltip /><Area dataKey="income" stroke="#5267df" fill="#5267df22" /><Area dataKey="expense" stroke="#f18470" fill="#f1847018" /></AreaChart></ResponsiveContainer></div>
      </article>
      <article className="panel rate"><TrendingUp /><span>{t("Savings rate")}</span><strong>56.1%</strong><p>{t("+6.7% from last month")}</p></article>
      <article className="panel">
        <PanelHead title="Largest expenses" sub="This month" />
        {demoTransactions.filter((item) => item[3] < 0).map((item, index) => <div className="rank" key={item[0]}><b>{index + 1}</b><span>{t(item[0])}<small>{t(item[1])}</small></span><strong>₺{Math.abs(item[3]).toLocaleString()}</strong></div>)}
      </article>
      <article className="panel"><PanelHead title="Budget performance" sub="September" />{demoBudgets.map((budget) => <BudgetRow budget={budget} key={budget[0]} />)}</article>
    </div>
  </>;
}

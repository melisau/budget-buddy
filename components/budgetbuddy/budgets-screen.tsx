"use client";

import { MoreHorizontal } from "lucide-react";
import { demoBudgets, spendingCategories } from "@/components/budgetbuddy/demo-data";
import { BudgetRow, ConfirmDelete, PageHead } from "@/components/budgetbuddy/shared";
import { useT } from "@/components/providers/language-provider";
import { Progress } from "@/components/ui/progress";

export function BudgetsScreen() {
  const t = useT();
  return <>
    <PageHead title="September budgets" sub="₺27,680 of ₺32,200 planned spending used" button="Create budget" />
    <article className="panel overall"><b>{t("Overall progress")} <strong>86%</strong></b><Progress value={86} /><span>{t("₺4,520 remaining")} <small>{t("20 days left")}</small></span></article>
    <div className="card-grid">
      {demoBudgets.map((budget, index) => {
        const Icon = spendingCategories[index][3];
        return <article className="panel budget-card" key={budget[0]}>
          <i className={`tone${index}`}><Icon /></i>
          <button type="button" aria-label={`${t("More")} ${t(budget[0])}`}><MoreHorizontal /></button>
          <h3>{t(budget[0])}</h3>
          <BudgetRow budget={budget} />
          <div><button type="button">{t("Edit")}</button><ConfirmDelete /></div>
        </article>;
      })}
    </div>
  </>;
}

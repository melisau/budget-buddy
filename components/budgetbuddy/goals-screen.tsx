"use client";

import { Target } from "lucide-react";
import { PageHead } from "@/components/budgetbuddy/shared";
import { useT } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const goals = [
  ["Germany Relocation Fund", 42000, 100000, "December 2026"],
  ["Emergency Fund", 26750, 40000, "March 2027"],
  ["New Laptop", 15500, 55000, "June 2027"],
] as const;

export function GoalsScreen() {
  const t = useT();
  return <>
    <PageHead title="Your savings goals" sub="Big plans become easier when progress is visible." button="Create goal" />
    <div className="goal-grid">{goals.map(([name, saved, target, date], index) => {
      const progress = Math.round(saved / target * 100);
      return <article className="panel goal" key={name}>
        <div className={`goal-art g${index}`}><Target /></div>
        <h3>{t(name)}</h3><p>{t("Target date")} · {t(date)}</p>
        <b>₺{saved.toLocaleString()} <span>{t("of")} ₺{target.toLocaleString()}</span></b>
        <Progress value={progress} />
        <small>{progress}% {t("complete")} <span>₺{(target - saved).toLocaleString()} {t("to go")}</span></small>
        <Button variant="outline">{t("Update progress")}</Button>
      </article>;
    })}</div>
  </>;
}

"use client";

import { useContext } from "react";
import Link from "next/link";
import { Target } from "lucide-react";
import { SavingsJarIcon } from "@/components/budgetbuddy/savings-jar-icon";
import { LanguageContext } from "@/components/providers/language-provider";

/**
 * Budgets and goals live on one "Bütçe ve Hedefler" page as two tabs, each
 * with a one-line explanation, because people mixed the two up when they were
 * separate pages. The tabs keep their own URLs (/budgets and /goals).
 */
export function PlansTabs({ active }: { active: "budgets" | "goals" }) {
  const tr = useContext(LanguageContext).language === "tr";
  const tabs = [
    { id: "budgets" as const, href: "/budgets", icon: SavingsJarIcon, label: tr ? "Bütçeler" : "Budgets", hint: tr ? "Harcama sınırı: bu ay bir kategoride en fazla ne kadar harcayacağın." : "Spending limit: the most you will spend in a category this month." },
    { id: "goals" as const, href: "/goals", icon: Target, label: tr ? "Hedefler" : "Goals", hint: tr ? "Birikim hedefi: bir şey için toplamak istediğin tutar." : "Savings goal: an amount you want to put aside for something." },
  ];
  const current = tabs.find((tab) => tab.id === active)!;
  return <div className="plans-tabs">
    <nav role="tablist" aria-label={tr ? "Bütçe ve hedefler" : "Budgets and goals"}>
      {tabs.map(({ id, href, icon: Icon, label }) => <Link key={id} href={href} role="tab" aria-selected={id === active} className={id === active ? "active" : ""}><Icon aria-hidden="true" />{label}</Link>)}
    </nav>
    <p>{current.hint}</p>
  </div>;
}

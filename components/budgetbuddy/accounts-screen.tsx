"use client";

import { Landmark, MoreHorizontal, PiggyBank, WalletCards, type LucideIcon } from "lucide-react";
import { PageHead } from "@/components/budgetbuddy/shared";
import { useT } from "@/components/providers/language-provider";

type AccountCard = readonly [string, string, string, LucideIcon];

const accounts = [
  ["Everyday account", "Checking · TRY", "₺38,450", Landmark],
  ["Savings", "Savings · TRY", "₺24,790", PiggyBank],
  ["Cash wallet", "Cash · TRY", "₺2,400", WalletCards],
  ["Travel card", "Credit Card · EUR", "€68", WalletCards],
] as const satisfies ReadonlyArray<AccountCard>;

export function AccountsScreen() {
  const t = useT();
  return <>
    <PageHead title="Your accounts" sub="Track every place you keep or spend money." button="Add account" />
    <div className="account-total"><span>{t("Total balance")}<strong>₺68,240</strong><small>{t("Across 4 active accounts")}</small></span><WalletCards /></div>
    <div className="card-grid">{accounts.map(([name, kind, balance, Icon]) => <article className="panel account" key={name}><i><Icon /></i><MoreHorizontal /><h3>{t(name)}</h3><p>{t(kind)}</p><strong>{balance}</strong><small>{t("Current balance")}</small></article>)}</div>
  </>;
}

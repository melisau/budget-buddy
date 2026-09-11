"use client";

import { ChevronRight, Plus, type LucideIcon } from "lucide-react";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { useT } from "@/components/providers/language-provider";
import { calculateBudgetUsage } from "@/lib/finance/calculations";
import type { BudgetSummary } from "@/types/finance";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export type DemoTransaction = readonly [string, string, string, number, LucideIcon];
export type BudgetRowData = readonly [string, number, number, string, string];

export function PanelHead({ title, sub, action, onClick }: { title: string; sub: string; action?: string; onClick?: () => void }) {
  const t = useT();
  return <header className="panel-head"><div><h3>{t(title)}</h3><p>{t(sub)}</p></div>{action && <button type="button" onClick={onClick}>{t(action)}<ChevronRight /></button>}</header>;
}

export function Transaction({ transaction }: { transaction: DemoTransaction }) {
  const t = useT();
  const Icon = transaction[4];
  return <div className="transaction"><i><Icon /></i><span><b>{t(transaction[0])}</b><small>{t(transaction[1])} · {t(transaction[2])}</small></span><strong className={transaction[3] > 0 ? "pos" : "neg"}>{transaction[3] > 0 ? "+" : "−"}₺{Math.abs(transaction[3]).toLocaleString()}</strong></div>;
}

export function BudgetRow({ budget }: { budget: BudgetRowData }) {
  const t = useT();
  const usage = calculateBudgetUsage({ category: budget[0], spent: budget[1], limit: budget[2] } satisfies BudgetSummary);
  return <div className="budget-row"><div><b>{t(budget[0])}</b><span>₺{budget[1].toLocaleString()} / ₺{budget[2].toLocaleString()}</span></div><Progress value={Math.min(100, usage)} /><small className={budget[4]}>{t(budget[3])}</small><strong>{usage}%</strong></div>;
}

export function AddTransaction() {
  const t = useT();
  return <Dialog><DialogTrigger asChild><Button><Plus />{t("Add transaction")}</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>{t("Add transaction")}</DialogTitle><DialogDescription>{t("Record a new income or expense.")}</DialogDescription></DialogHeader><TransactionForm /></DialogContent></Dialog>;
}

export function PageHead({ title, sub, button }: { title: string; sub: string; button: string }) {
  const t = useT();
  return <div className="page-head"><div><h2>{t(title)}</h2><p>{t(sub)}</p></div><Button><Plus />{t(button)}</Button></div>;
}

export function ConfirmDelete() {
  const t = useT();
  return <AlertDialog><AlertDialogTrigger asChild><button type="button" className="delete">{t("Delete")}</button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t("Delete this item?")}</AlertDialogTitle><AlertDialogDescription>{t("This action cannot be undone.")}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t("Cancel")}</AlertDialogCancel><AlertDialogAction>{t("Delete")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>;
}

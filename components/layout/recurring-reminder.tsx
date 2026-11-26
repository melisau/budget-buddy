"use client";

import { useCallback, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { BrandBadge } from "@/components/budgetbuddy/brand-badge";
import { LanguageContext } from "@/components/providers/language-provider";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/finance/currency";
import { notifyFinanceDataChanged } from "@/lib/finance/data-events";
import { daysUntil } from "@/lib/finance/recurring";
import type { Currency } from "@/types/finance";
import { localized, germanOr } from "@/lib/i18n/localized";

type Reminder = { id: string; title: string; amount: number; type: "income" | "expense"; nextDate: string; currency: string };

const SNOOZE_KEY = "budgetbuddy-reminder-snooze";
const todayLocal = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date());

/** "id:date" pairs the user postponed in this browser session. */
function readSnoozed(): string[] {
  try { return JSON.parse(window.sessionStorage.getItem(SNOOZE_KEY) ?? "[]") as string[]; } catch { return []; }
}
function snooze(reminder: Reminder) {
  try { window.sessionStorage.setItem(SNOOZE_KEY, JSON.stringify([...readSnoozed(), `${reminder.id}:${reminder.nextDate}`])); } catch { /* storage may be blocked */ }
}

/**
 * Asks about recurring payments whose reminder is due: paid, skipped this time,
 * or later. Paid and skipped need a second, summarized confirmation so a stray
 * tap cannot record or drop a payment; closing the window only postpones it.
 */
export function RecurringReminder() {
  const pathname = usePathname();
  const { language } = useContext(LanguageContext);
  const tr = language === "tr";
  const [reminder, setReminder] = useState<Reminder | null>(null);
  const [confirming, setConfirming] = useState<"paid" | "skipped" | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/recurring/reminders", { cache: "no-store" });
      if (!response.ok) return;
      const { reminders } = await response.json() as { reminders: Reminder[] };
      const snoozed = readSnoozed();
      setReminder(reminders.find((item) => !snoozed.includes(`${item.id}:${item.nextDate}`)) ?? null);
    } catch { /* a reminder is never worth an error message */ }
  }, []);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load, pathname]);

  if (!reminder) return null;
  const money = formatCurrency(reminder.amount, (reminder.currency || "TRY") as Currency, language);
  const date = new Intl.DateTimeFormat(tr ? "tr-TR" : localized("en-US"), { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${reminder.nextDate}T00:00:00Z`));
  const days = daysUntil(reminder.nextDate, todayLocal());
  const when = days < 0 ? (tr ? `${-days} gün gecikti` : germanOr(`${-days} Tage überfällig`, `${-days} days overdue`)) : days === 0 ? (tr ? "bugün" : localized("today")) : days === 1 ? (tr ? "yarın" : localized("tomorrow")) : tr ? `${days} gün sonra` : germanOr(`in ${days} Tagen`, `in ${days} days`);
  const income = reminder.type === "income";

  const later = () => { snooze(reminder); setReminder(null); void load(); };
  const settle = async (paid: boolean) => {
    setBusy(true);
    try {
      const response = await fetch(`/api/recurring/${reminder.id}/settle`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: reminder.nextDate, paid }) });
      if (!response.ok && response.status !== 409) throw new Error();
      toast.success(paid ? (tr ? `${reminder.title} kaydedildi.` : germanOr(`${reminder.title} erfasst.`, `${reminder.title} recorded.`)) : (tr ? `${reminder.title} bu dönem için atlandı.` : germanOr(`${reminder.title} diesmal übersprungen.`, `${reminder.title} skipped this time.`)));
      if (paid) notifyFinanceDataChanged();
      setConfirming(null);
      await load();
    } catch {
      toast.error(tr ? "Ödeme güncellenemedi. Tekrar dene." : localized("Unable to update the payment. Try again."));
    } finally { setBusy(false); }
  };

  return <>
    <Dialog open={confirming === null} onOpenChange={(open) => { if (!open) later(); }}>
      <DialogContent className="recurring-reminder-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><BrandBadge name={reminder.title} size={24} />{income ? (tr ? `${reminder.title} geliri ${when}` : germanOr(`Einnahme ${reminder.title} ${when}`, `${reminder.title} income ${when}`)) : (tr ? `${reminder.title} ödemesi ${when}` : germanOr(`Zahlung ${reminder.title} ${when}`, `${reminder.title} payment ${when}`))}</DialogTitle>
          <DialogDescription>{tr ? `${date} tarihli ödeme. Yapıldı mı?` : germanOr(`Zahlung fällig am ${date}. Wurde sie geleistet?`, `Payment due on ${date}. Has it been made?`)}</DialogDescription>
        </DialogHeader>
        <p className="reminder-amount m-0">{income ? "+" : "−"}{money}</p>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="ghost" onClick={later}>{tr ? "Sonra hatırlat" : localized("Remind me later")}</Button>
          <Button variant="outline" onClick={() => setConfirming("skipped")}>{income ? (tr ? "Bu sefer gelmedi" : localized("Not received this time")) : (tr ? "Bu sefer ödemedim" : localized("Not paid this time"))}</Button>
          <Button onClick={() => setConfirming("paid")}>{income ? (tr ? "Geldi" : localized("Received")) : (tr ? "Ödedim" : localized("Paid"))}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <AlertDialog open={confirming !== null} onOpenChange={(open) => { if (!open && !busy) setConfirming(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{confirming === "paid" ? (tr ? "Ödendi olarak kaydedilsin mi?" : localized("Record as paid?")) : (tr ? "Bu dönem atlansın mı?" : localized("Skip this time?"))}</AlertDialogTitle>
          <AlertDialogDescription>
            {confirming === "paid"
              ? (tr ? `“${reminder.title}” · ${money} · ${date}. İşlemlerine eklenecek.` : germanOr(`„${reminder.title}“ · ${money} · ${date}. Sie wird zu deinen Transaktionen hinzugefügt.`, `“${reminder.title}” · ${money} · ${date}. It will be added to your transactions.`))
              : (tr ? `“${reminder.title}” · ${money} · ${date}. Bu dönem için işlem eklenmeyecek; sonraki ödeme yine hatırlatılacak.` : germanOr(`„${reminder.title}“ · ${money} · ${date}. Diesmal wird keine Transaktion hinzugefügt; an die nächste Zahlung wird wie gewohnt erinnert.`, `“${reminder.title}” · ${money} · ${date}. No transaction is added for this time; the next payment is reminded as usual.`))}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{tr ? "Geri dön" : localized("Go back")}</AlertDialogCancel>
          <AlertDialogAction disabled={busy} onClick={(event) => { event.preventDefault(); void settle(confirming === "paid"); }}>{busy ? "…" : confirming === "paid" ? (tr ? "Evet, kaydet" : localized("Yes, record it")) : (tr ? "Evet, atla" : localized("Yes, skip"))}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}

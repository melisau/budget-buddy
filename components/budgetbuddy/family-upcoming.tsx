"use client";

import { useContext, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { BrandBadge } from "@/components/budgetbuddy/brand-badge";
import { LanguageContext } from "@/components/providers/language-provider";
import { formatCurrency } from "@/lib/finance/currency";
import { daysUntil } from "@/lib/finance/recurring";
import type { Currency } from "@/types/finance";
import { localized } from "@/lib/i18n/localized";

type Upcoming = { id: string; ownerUserId: string; title: string; amount: number; type: "income" | "expense"; nextDate: string };
const todayLocal = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date());

/** Payments members chose to show this group, for the next month. Each member decides per instruction. */
export function FamilyUpcoming({ groupId, currency, members }: { groupId: string; currency: string; members: { userId: string | null; name: string }[] }) {
  const { language } = useContext(LanguageContext);
  const tr = language === "tr";
  const [items, setItems] = useState<Upcoming[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/family/${groupId}/upcoming`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error(); return await response.json() as { upcoming: Upcoming[] }; })
      .then((data) => { setItems(data.upcoming); setFailed(false); })
      .catch((error) => { if (!(error instanceof DOMException && error.name === "AbortError")) setFailed(true); });
    return () => controller.abort();
  }, [groupId]);

  const name = (userId: string) => members.find((member) => member.userId === userId)?.name ?? (tr ? "Bir üye" : localized("A member"));
  const when = (date: string) => {
    const days = daysUntil(date, todayLocal());
    return days === 0 ? (tr ? "Bugün" : localized("Today")) : days === 1 ? (tr ? "Yarın" : localized("Tomorrow")) : new Intl.DateTimeFormat(tr ? "tr-TR" : localized("en-US"), { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
  };

  return <article className="panel family-upcoming">
    <div className="panel-head"><div><h3><CalendarClock aria-hidden="true" />{tr ? "Yaklaşan ödemeler" : localized("Upcoming payments")}</h3><p>{tr ? "Üyelerin aileyle paylaşmayı seçtiği talimatlar · 30 gün" : localized("Instructions members chose to share · next 30 days")}</p></div></div>
    {failed ? <p className="empty-state">{tr ? "Yüklenemedi." : localized("Unable to load.")}</p>
      : items === null ? <p className="empty-state" role="status">{tr ? "Yükleniyor…" : localized("Loading…")}</p>
      : items.length === 0 ? <p className="empty-state">{tr ? "Paylaşılan yaklaşan ödeme yok. Kendi talimatlarını " : localized("No shared upcoming payments. Share your own from ")}<Link href="/recurring">{tr ? "Otomatik Talimatlar" : localized("Automatic instructions")}</Link>{tr ? "’dan “Aileyle paylaş” ile gösterebilirsin." : localized(" with “Share with family”.")}</p>
      : <ul>{items.map((item) => <li key={item.id}><span className="family-upcoming-date">{when(item.nextDate)}</span><span className="family-upcoming-title"><BrandBadge name={item.title} size={18} /><b>{item.title}</b><small>{name(item.ownerUserId)}</small></span><strong className={item.type}>{item.type === "income" ? "+" : "−"}{formatCurrency(item.amount, currency as Currency, language)}</strong></li>)}</ul>}
  </article>;
}

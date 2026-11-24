// Turns a stored notification into text. Shared by the bell and the e-mail,
// so the words stay in one place. Notifications are stored as data, not prose,
// so they follow the reader's language.
import { categoryDisplayName } from "@/lib/finance/category-names";
import type { NotificationData, NotificationKind } from "@/lib/notifications/rules";

import { localeOf, type Language } from "@/lib/i18n/localized";
export type { Language };
export type RenderedNotification = { title: string; body: string; href: "/budgets" | "/goals" | "/family" | "/recurring" };

function money(value: unknown, currency: unknown, language: Language) {
  const code = typeof currency === "string" && /^[A-Z]{3}$/.test(currency) ? currency : "TRY";
  return new Intl.NumberFormat(localeOf(language), { style: "currency", currency: code, maximumFractionDigits: 0 }).format(Number(value) || 0);
}

function dateText(value: unknown, language: Language) {
  const parsed = typeof value === "string" ? new Date(`${value}T00:00:00Z`) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat(localeOf(language), { day: "numeric", month: "long", timeZone: "UTC" }).format(parsed);
}

export function renderNotification(kind: NotificationKind, data: NotificationData, language: Language): RenderedNotification {
  /** Picks the text for the reader's language. */
  const L = (trText: string, en: string, de: string) => (language === "tr" ? trText : language === "de" ? de : en);
  const category = categoryDisplayName(String(data.categoryName ?? ""), language);
  const m = (value: unknown) => money(value, data.currency, language);
  const whenText = (days: number) => days <= 0 ? L("bugün", "today", "heute") : days === 1 ? L("yarın", "tomorrow", "morgen") : L(`${days} gün sonra`, `in ${days} days`, `in ${days} Tagen`);
  switch (kind) {
    case "budget_warning":
      if (data.scope === "total") return {
        href: "/budgets",
        title: tr ? `Genel aylık bütçenin %${data.usage}'ini kullandın` : `You used ${data.usage}% of your overall monthly budget`,
        body: tr
          ? `${money(data.spent, data.currency, language)} / ${money(data.limit, data.currency, language)} harcadın. Ay bitmeden limite yaklaşıyorsun.`
          : `You spent ${money(data.spent, data.currency, language)} of ${money(data.limit, data.currency, language)}. You are close to this month's limit.`,
      };
      return {
        href: "/budgets",
        title: L(`${category} bütçesinin %${data.usage}'ini kullandın`, `You used ${data.usage}% of your ${category} budget`, `Du hast ${data.usage} % deines Budgets für ${category} genutzt`),
        body: L(`${m(data.spent)} / ${m(data.limit)} harcadın. Limite yaklaşıyorsun.`, `You spent ${m(data.spent)} of ${m(data.limit)}. You are close to the limit.`, `Du hast ${m(data.spent)} von ${m(data.limit)} ausgegeben. Du näherst dich dem Limit.`),
      };
    case "budget_exceeded":
      if (data.scope === "total") return {
        href: "/budgets",
        title: tr ? "Genel aylık bütçeni aştın" : "You went over your overall monthly budget",
        body: tr
          ? `Bu ay ${money(data.spent, data.currency, language)} harcadın; genel limitin ${money(data.limit, data.currency, language)}.`
          : `You spent ${money(data.spent, data.currency, language)} this month; the overall limit is ${money(data.limit, data.currency, language)}.`,
      };
      return {
        href: "/budgets",
        title: L(`${category} bütçesini aştın`, `You went over your ${category} budget`, `Du hast dein Budget für ${category} überschritten`),
        body: L(`${m(data.spent)} harcadın; limit ${m(data.limit)}.`, `You spent ${m(data.spent)}; the limit is ${m(data.limit)}.`, `Du hast ${m(data.spent)} ausgegeben; das Limit ist ${m(data.limit)}.`),
      };
    case "goal_due": {
      const when = whenText(Number(data.daysLeft));
      return {
        href: "/goals",
        title: L(`${data.goalName} hedefinin tarihi ${when}`, `Your goal “${data.goalName}” is due ${when}`, `Dein Ziel „${data.goalName}“ ist ${when} fällig`),
        body: L(`Hedefe ${m(data.remaining)} kaldı (son tarih ${dateText(data.deadline, language)}).`, `${m(data.remaining)} left to reach it (deadline ${dateText(data.deadline, language)}).`, `Noch ${m(data.remaining)} bis zum Ziel (Frist ${dateText(data.deadline, language)}).`),
      };
    }
    case "recurring_due": {
      const when = whenText(Number(data.daysLeft));
      const income = data.type === "income";
      return {
        href: "/recurring",
        title: income
          ? L(`${data.title} geliri ${when}`, `${data.title} income is due ${when}`, `Einnahme ${data.title} ist ${when} fällig`)
          : L(`${data.title} ödemesi ${when}`, `${data.title} payment is due ${when}`, `Zahlung ${data.title} ist ${when} fällig`),
        body: L(
          `${m(data.amount)} · ${dateText(data.dueDate, language)}. Açılan hatırlatmadan “Ödedim” ya da “Bu sefer ödemedim” seç.`,
          `${m(data.amount)} · ${dateText(data.dueDate, language)}. Mark it as paid or skipped in the reminder.`,
          `${m(data.amount)} · ${dateText(data.dueDate, language)}. Markiere sie in der Erinnerung als bezahlt oder übersprungen.`,
        ),
      };
    }
    case "family_invite":
      return {
        href: "/family",
        title: L(`“${data.groupName}” grubuna davet edildin`, `You were invited to “${data.groupName}”`, `Du wurdest zu „${data.groupName}“ eingeladen`),
        body: L("Daveti Aile sayfasından kabul edebilir veya reddedebilirsin.", "Accept or decline the invitation on the Family page.", "Nimm die Einladung auf der Familienseite an oder lehne sie ab."),
      };
  }
}

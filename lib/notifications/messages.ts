// Turns a stored notification into text. Shared by the bell and the e-mail,
// so the words stay in one place. Notifications are stored as data, not prose,
// so they follow the reader's language.
import { categoryDisplayName } from "@/lib/finance/category-names";
import type { NotificationData, NotificationKind } from "@/lib/notifications/rules";

export type Language = "tr" | "en";
export type RenderedNotification = { title: string; body: string; href: "/budgets" | "/goals" | "/family" | "/recurring" };

function money(value: unknown, currency: unknown, language: Language) {
  const code = typeof currency === "string" && /^[A-Z]{3}$/.test(currency) ? currency : "TRY";
  return new Intl.NumberFormat(language === "tr" ? "tr-TR" : "en-US", { style: "currency", currency: code, maximumFractionDigits: 0 }).format(Number(value) || 0);
}

function dateText(value: unknown, language: Language) {
  const parsed = typeof value === "string" ? new Date(`${value}T00:00:00Z`) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat(language === "tr" ? "tr-TR" : "en-US", { day: "numeric", month: "long", timeZone: "UTC" }).format(parsed);
}

export function renderNotification(kind: NotificationKind, data: NotificationData, language: Language): RenderedNotification {
  const tr = language === "tr";
  const category = categoryDisplayName(String(data.categoryName ?? ""), language);
  switch (kind) {
    case "budget_warning":
      return {
        href: "/budgets",
        title: tr ? `${category} bütçesinin %${data.usage}'ini kullandın` : `You used ${data.usage}% of your ${category} budget`,
        body: tr
          ? `${money(data.spent, data.currency, language)} / ${money(data.limit, data.currency, language)} harcadın. Limite yaklaşıyorsun.`
          : `You spent ${money(data.spent, data.currency, language)} of ${money(data.limit, data.currency, language)}. You are close to the limit.`,
      };
    case "budget_exceeded":
      return {
        href: "/budgets",
        title: tr ? `${category} bütçesini aştın` : `You went over your ${category} budget`,
        body: tr
          ? `${money(data.spent, data.currency, language)} harcadın; limit ${money(data.limit, data.currency, language)}.`
          : `You spent ${money(data.spent, data.currency, language)}; the limit is ${money(data.limit, data.currency, language)}.`,
      };
    case "goal_due": {
      const days = Number(data.daysLeft);
      const when = days === 0 ? (tr ? "bugün" : "today") : days === 1 ? (tr ? "yarın" : "tomorrow") : tr ? `${days} gün sonra` : `in ${days} days`;
      return {
        href: "/goals",
        title: tr ? `${data.goalName} hedefinin tarihi ${when}` : `Your goal “${data.goalName}” is due ${when}`,
        body: tr
          ? `Hedefe ${money(data.remaining, data.currency, language)} kaldı (son tarih ${dateText(data.deadline, language)}).`
          : `${money(data.remaining, data.currency, language)} left to reach it (deadline ${dateText(data.deadline, language)}).`,
      };
    }
    case "recurring_due": {
      const days = Number(data.daysLeft);
      const when = days <= 0 ? (tr ? "bugün" : "today") : days === 1 ? (tr ? "yarın" : "tomorrow") : tr ? `${days} gün sonra` : `in ${days} days`;
      const income = data.type === "income";
      return {
        href: "/recurring",
        title: income
          ? (tr ? `${data.title} geliri ${when}` : `${data.title} income is due ${when}`)
          : (tr ? `${data.title} ödemesi ${when}` : `${data.title} payment is due ${when}`),
        body: tr
          ? `${money(data.amount, data.currency, language)} · ${dateText(data.dueDate, language)}. Açılan hatırlatmadan “Ödedim” ya da “Bu sefer ödemedim” seç.`
          : `${money(data.amount, data.currency, language)} · ${dateText(data.dueDate, language)}. Mark it on the Recurring page once it is done.`,
      };
    }
    case "family_invite":
      return {
        href: "/family",
        title: tr ? `“${data.groupName}” grubuna davet edildin` : `You were invited to “${data.groupName}”`,
        body: tr ? "Daveti Aile sayfasından kabul edebilir veya reddedebilirsin." : "Accept or decline the invitation on the Family page.",
      };
  }
}

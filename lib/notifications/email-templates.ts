// Plain e-mail bodies. Pure functions so they can be tested without sending.
import { renderNotification, type Language, type RenderedNotification } from "@/lib/notifications/messages";
import type { NotificationData, NotificationKind } from "@/lib/notifications/rules";

export type EmailContent = { subject: string; text: string; html: string };

export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function wrap(bodyHtml: string, footerHtml: string): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#17213c;max-width:520px;margin:0 auto;padding:24px">`
    + `<p style="font-size:18px;font-weight:700;color:#4258d5;margin:0 0 16px">BudgetBuddy</p>${bodyHtml}`
    + `<p style="margin-top:28px;padding-top:16px;border-top:1px solid #e1e5ee;font-size:12px;color:#69738c">${footerHtml}</p></div>`;
}

type StoredNotification = { kind: NotificationKind; data: NotificationData };

/** One e-mail per user per run, listing every new budget and goal notification. */
export function digestEmail(items: StoredNotification[], language: Language, siteUrl: string): EmailContent {
  const tr = language === "tr";
  const rendered: RenderedNotification[] = items.map((item) => renderNotification(item.kind, item.data, language));
  const subject = rendered.length === 1 ? rendered[0].title : tr ? `BudgetBuddy: ${rendered.length} yeni bildirim` : `BudgetBuddy: ${rendered.length} new notifications`;
  const settingsUrl = `${siteUrl}/settings`;
  const footerText = tr
    ? `Bu e-postaları almak istemiyorsan Ayarlar sayfasından kapatabilirsin: ${settingsUrl}`
    : `You can turn these e-mails off in Settings: ${settingsUrl}`;
  const text = `${rendered.map((item) => `${item.title}\n${item.body}\n${siteUrl}${item.href}`).join("\n\n")}\n\n${footerText}\n`;
  const html = wrap(
    rendered.map((item) => `<p style="margin:0 0 20px"><strong>${escapeHtml(item.title)}</strong><br>${escapeHtml(item.body)}<br><a href="${escapeHtml(siteUrl + item.href)}" style="color:#4258d5">${tr ? "Aç" : "Open"}</a></p>`).join(""),
    `${tr ? "Bu e-postaları almak istemiyorsan" : "You can turn these e-mails off in"} <a href="${escapeHtml(settingsUrl)}" style="color:#4258d5">${tr ? "Ayarlar sayfasından kapatabilirsin" : "Settings"}</a>.`,
  );
  return { subject, text, html };
}

/** Sent to the invited address, which may not have an account yet, so it is in both languages. */
export function inviteEmail(groupName: string, inviterName: string, siteUrl: string): EmailContent {
  const link = `${siteUrl}/sign-up?redirect=${encodeURIComponent("/family")}`;
  const signInLink = `${siteUrl}/sign-in?redirect=${encodeURIComponent("/family")}`;
  const subject = `${inviterName} seni BudgetBuddy'de “${groupName}” grubuna davet etti / invited you to “${groupName}” on BudgetBuddy`;
  const text = [
    `${inviterName} seni BudgetBuddy'de “${groupName}” aile grubuna davet etti.`,
    `Daveti kabul etmek için bu e-posta adresiyle kayıt ol veya giriş yap: ${link}`,
    `Zaten hesabın varsa: ${signInLink}`,
    "",
    `${inviterName} invited you to the family group “${groupName}” on BudgetBuddy.`,
    `To accept, sign up with this e-mail address or sign in: ${link}`,
    `Already have an account: ${signInLink}`,
    "",
    "Bu daveti beklemiyorsan bu e-postayı yok sayabilirsin. / If you did not expect this invitation, you can ignore this e-mail.",
  ].join("\n");
  const html = wrap(
    `<p><strong>${escapeHtml(inviterName)}</strong> seni BudgetBuddy'de <strong>“${escapeHtml(groupName)}”</strong> aile grubuna davet etti.</p>`
    + `<p><a href="${escapeHtml(link)}" style="color:#4258d5">Bu e-posta adresiyle kayıt ol</a> veya <a href="${escapeHtml(signInLink)}" style="color:#4258d5">giriş yap</a>.</p>`
    + `<p><strong>${escapeHtml(inviterName)}</strong> invited you to the family group <strong>“${escapeHtml(groupName)}”</strong> on BudgetBuddy.</p>`
    + `<p><a href="${escapeHtml(link)}" style="color:#4258d5">Sign up with this e-mail address</a> or <a href="${escapeHtml(signInLink)}" style="color:#4258d5">sign in</a>.</p>`,
    "Bu daveti beklemiyorsan bu e-postayı yok sayabilirsin. / If you did not expect this invitation, you can ignore this e-mail.",
  );
  return { subject, text, html };
}

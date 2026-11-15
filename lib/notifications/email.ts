import "server-only";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import type { EmailContent } from "@/lib/notifications/email-templates";

type SmtpConfig = { host: string; port: number; user: string | null; password: string | null; from: string };

/** SMTP settings from the environment, or null when e-mail is not configured. */
export function readSmtpConfig(env: Record<string, string | undefined> = process.env): SmtpConfig | null {
  const host = env.SMTP_HOST?.trim();
  const from = env.SMTP_FROM?.trim();
  if (!host || !from) return null;
  const port = Number(env.SMTP_PORT) || 587;
  return { host, port, user: env.SMTP_USER?.trim() || null, password: env.SMTP_PASSWORD || null, from };
}

export function isEmailConfigured(): boolean {
  return readSmtpConfig() !== null;
}

let cached: { key: string; transport: Transporter } | null = null;

function transport(config: SmtpConfig): Transporter {
  const key = JSON.stringify([config.host, config.port, config.user]);
  if (cached?.key === key) return cached.transport;
  const created = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: config.user && config.password ? { user: config.user, pass: config.password } : undefined,
    connectionTimeout: 10_000,
    socketTimeout: 20_000,
  });
  cached = { key, transport: created };
  return created;
}

/** Sends one e-mail. Throws when SMTP is not configured or the server rejects it. */
export async function sendEmail(to: string, content: EmailContent): Promise<void> {
  const config = readSmtpConfig();
  if (!config) throw new Error("E-mail is not configured (SMTP_HOST and SMTP_FROM are required).");
  await transport(config).sendMail({ from: config.from, to, subject: content.subject, text: content.text, html: content.html });
}

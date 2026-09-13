"use client";

import { useEffect, useState } from "react";
import { CreditCard, ExternalLink, ReceiptText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

type BillingDetails = {
  subscription: {
    plan: "free" | "core" | "pro";
    status: "inactive" | "trialing" | "active" | "past_due" | "canceled" | "unpaid";
    trialEndsAt: string | null;
    endsAt: string | null;
    fullAccess: boolean;
    canManage: boolean;
  };
  invoices: Array<{
    stripe_invoice_id: string;
    amount_paid: number;
    currency: string;
    status: string;
    invoice_url: string | null;
    paid_at: string | null;
    created_at: string;
  }>;
};

const planLabels = { free: "Free", core: "Core", pro: "Pro" };

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value)) : "—";
}

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
}

export function SubscriptionCard() {
  const [billing, setBilling] = useState<BillingDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<"core" | "pro" | "portal" | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/billing", { cache: "no-store" });
        const data = await response.json() as BillingDetails & { error?: string };
        if (!response.ok) throw new Error(data.error ?? "Unable to load billing details.");
        setBilling(data);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unable to load billing details.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openCheckout = async (plan: "core" | "pro") => {
    setAction(plan);
    setError(null);
    try {
      const response = await fetch("/api/billing/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan }) });
      const data = await response.json() as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error ?? "Unable to start checkout.");
      window.location.assign(data.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to start checkout.");
      setAction(null);
    }
  };

  const openPortal = async () => {
    setAction("portal");
    setError(null);
    try {
      const response = await fetch("/api/billing/portal", { method: "POST" });
      const data = await response.json() as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error ?? "Unable to open the billing portal.");
      window.location.assign(data.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to open the billing portal.");
      setAction(null);
    }
  };

  if (loading) return <article className="panel subscription-card"><p>Loading subscription details…</p></article>;
  if (!billing) return <article className="panel subscription-card"><h3>Subscription</h3><p className="form-error">{error ?? "Billing details are unavailable."}</p></article>;

  const { subscription, invoices } = billing;
  return <article className="panel subscription-card">
    <div className="subscription-card-header"><div><span><CreditCard aria-hidden="true" />Subscription</span><h3>{planLabels[subscription.plan]} plan</h3></div><b className={subscription.fullAccess ? "access-active" : "access-limited"}>{subscription.fullAccess ? "Full access" : subscription.status}</b></div>
    {subscription.status === "trialing" && <p className="trial-note"><Sparkles aria-hidden="true" />All features are available during your trial{subscription.trialEndsAt ? ` until ${formatDate(subscription.trialEndsAt)}` : ""}.</p>}
    {subscription.endsAt && <p className="subscription-ending">Your subscription is scheduled to end on {formatDate(subscription.endsAt)}.</p>}
    <div className="subscription-actions">
      <Button variant="outline" disabled={action !== null} onClick={() => void openCheckout("core")}>{action === "core" ? "Opening…" : "Choose Core"}</Button>
      <Button disabled={action !== null} onClick={() => void openCheckout("pro")}>{action === "pro" ? "Opening…" : "Choose Pro"}</Button>
      {subscription.canManage && <Button variant="ghost" disabled={action !== null} onClick={() => void openPortal()}>{action === "portal" ? "Opening…" : "Manage billing"}<ExternalLink /></Button>}
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="invoice-history"><div><ReceiptText aria-hidden="true" /><span><b>Invoice history</b><small>Your paid invoices appear here.</small></span></div>{invoices.length === 0 ? <p>No invoices yet.</p> : <ul>{invoices.map((invoice) => <li key={invoice.stripe_invoice_id}><span><b>{formatAmount(invoice.amount_paid, invoice.currency)}</b><small>{formatDate(invoice.paid_at ?? invoice.created_at)}</small></span>{invoice.invoice_url ? <a href={invoice.invoice_url} target="_blank" rel="noreferrer">View invoice <ExternalLink /></a> : <small>{invoice.status}</small>}</li>)}</ul>}</div>
  </article>;
}

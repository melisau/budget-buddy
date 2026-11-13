"use client";

import { useContext, useEffect, useState } from "react";
import { CreditCard, Sparkles } from "lucide-react";
import { LanguageContext, useT } from "@/components/providers/language-provider";

type BillingDetails = {
  billingEnabled?: boolean;
  subscription: {
    plan: "free" | "core" | "pro";
    status: "inactive" | "trialing" | "active" | "past_due" | "canceled" | "unpaid";
    trialEndsAt: string | null;
    endsAt: string | null;
    fullAccess: boolean;
  };
};

const planLabels = { free: "Free", core: "Core", pro: "Pro" };

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value)) : "—";
}

export function SubscriptionCard() {
  const t = useT();
  const { language } = useContext(LanguageContext);
  const [billing, setBilling] = useState<BillingDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <article className="panel subscription-card"><p>Loading subscription details…</p></article>;
  if (!billing) return <article className="panel subscription-card"><h3>Subscription</h3><p className="form-error">{error ?? "Billing details are unavailable."}</p></article>;

  const { subscription } = billing;
  if (!billing.billingEnabled) {
    return <article className="panel subscription-card launch-membership">
      <span className="settings-row-icon" aria-hidden="true"><Sparkles /></span><div><h3>{language === "tr" ? "Lansmana özel ücretsiz" : "Free during launch"}</h3><p>{language === "tr" ? "Şu anda tüm özellikler ücretsiz." : "All features are currently free."}</p></div><span className="launch-membership-status">{t("Active")}</span>
    </article>;
  }
  return <article className="panel subscription-card">
    <div className="subscription-card-header"><div><span><CreditCard aria-hidden="true" />Subscription</span><h3>{planLabels[subscription.plan]} plan</h3></div><b className={subscription.fullAccess ? "access-active" : "access-limited"}>{subscription.fullAccess ? "Full access" : subscription.status}</b></div>
    {subscription.status === "trialing" && <p className="trial-note"><Sparkles aria-hidden="true" />All features are available during your trial{subscription.trialEndsAt ? ` until ${formatDate(subscription.trialEndsAt)}` : ""}.</p>}
    {subscription.endsAt && <p className="subscription-ending">Your subscription is scheduled to end on {formatDate(subscription.endsAt)}.</p>}
  </article>;
}

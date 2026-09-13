"use client";

import { useClerk, useUser } from "@clerk/react";
import { useState } from "react";
import { Download } from "lucide-react";
import { useT } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { SubscriptionCard } from "@/components/billing/subscription-card";

export function SettingsScreen() {
  const t = useT();
  const { openUserProfile } = useClerk();
  const { user } = useUser();
  const displayName = user?.fullName || "";
  const email = user?.primaryEmailAddress?.emailAddress || "";
  const initials = displayName.split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "BB";
  const [deleting, setDeleting] = useState(false);
  const deleteAccount = async () => { if (!window.confirm(t("Permanently remove all data."))) return; setDeleting(true); try { const response = await fetch("/api/account", { method: "DELETE" }); if (!response.ok) throw new Error(); window.location.assign("/"); } finally { setDeleting(false); } };
  return <div className="settings">
    <nav aria-label={t("Settings sections")}>{["Profile", "Preferences", "Categories", "Subscription", "Data"].map((label, index) => <button type="button" className={index === 0 ? "active" : ""} key={label}>{t(label)}</button>)}</nav>
    <section>
      <article className="panel settings-card">
        <h3>{t("Profile")}</h3><p>{t("Update your personal details.")}</p>
        <div className="avatar"><span>{initials}</span><Button type="button" variant="outline" onClick={() => openUserProfile()}>{t("Change photo")}</Button></div>
        <div className="form-grid"><label>{t("Full name")}<Input value={displayName} readOnly /></label><label>{t("Email")}<Input value={email} readOnly /></label></div>
        <Button type="button" onClick={() => openUserProfile()}>{t("Manage account")}</Button>
      </article>
      <article className="panel settings-card">
        <h3>{t("Preferences")}</h3><p>{t("Customize currency and appearance.")}</p>
        <div className="setting"><span><b>{t("Currency")}</b><small>{t("Used across balances and reports.")}</small></span><Select defaultValue="TRY"><SelectTrigger aria-label={t("Currency")}><SelectValue /></SelectTrigger><SelectContent>{["TRY", "EUR", "USD", "GBP"].map((currency) => <SelectItem value={currency} key={currency}>{currency}</SelectItem>)}</SelectContent></Select></div>
        <div className="setting"><span><b>{t("Dark mode")}</b><small>{t("Use a darker color theme.")}</small></span><Switch aria-label={t("Dark mode")} /></div>
        <div className="setting"><span><b>{t("Budget notifications")}</b><small>{t("Get notified near a limit.")}</small></span><Switch aria-label={t("Budget notifications")} defaultChecked /></div>
      </article>
      <SubscriptionCard />
      <article className="panel settings-card">
        <h3>{t("Data")}</h3>
        <div className="setting"><span><b>{t("Export data")}</b><small>{t("Download your records as CSV.")}</small></span><Button variant="outline"><Download />{t("Export")}</Button></div>
        <div className="setting"><span><b>{t("Delete account")}</b><small>{t("Permanently remove all data.")}</small></span><Button variant="destructive" disabled={deleting} onClick={() => void deleteAccount()}>{deleting ? "…" : t("Delete")}</Button></div>
      </article>
    </section>
  </div>;
}

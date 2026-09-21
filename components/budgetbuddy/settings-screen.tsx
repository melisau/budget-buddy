"use client";

import { useClerk, useUser } from "@clerk/react";
import { useContext, useEffect, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { LanguageContext, useT } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SubscriptionCard } from "@/components/billing/subscription-card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export function SettingsScreen() {
  const t = useT();
  const { language } = useContext(LanguageContext);
  const { openUserProfile } = useClerk();
  const { user } = useUser();
  const displayName = user?.fullName || "";
  const email = user?.primaryEmailAddress?.emailAddress || "";
  const initials = displayName.split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "BB";
  const [deleting, setDeleting] = useState(false);
  const [currency, setCurrency] = useState("TRY");
  const [savingCurrency, setSavingCurrency] = useState(false);
  const [exporting, setExporting] = useState(false);
  useEffect(() => { void fetch("/api/account", { cache: "no-store" }).then(async (response) => { if (!response.ok) throw new Error(); return await response.json() as { currency?: string }; }).then((data) => { if (data.currency) setCurrency(data.currency); }).catch(() => undefined); }, []);
  const saveCurrency = async (value: string) => { const previous = currency; setCurrency(value); setSavingCurrency(true); try { const response = await fetch("/api/account", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currency: value }) }); if (!response.ok) throw new Error(); toast.success(t("Currency updated.")); } catch { setCurrency(previous); toast.error(t("Unable to update account preferences.")); } finally { setSavingCurrency(false); } };
  const exportData = async () => { setExporting(true); try { const response = await fetch("/api/transactions/export?scope=all"); if (!response.ok) throw new Error(); const url = URL.createObjectURL(await response.blob()); const link = document.createElement("a"); link.href = url; link.download = "budgetbuddy-transactions.csv"; link.click(); link.remove(); URL.revokeObjectURL(url); } catch { toast.error(language === "tr" ? "Veriler dışa aktarılamadı." : "Unable to export data."); } finally { setExporting(false); } };
  const deleteAccount = async () => { setDeleting(true); try { const response = await fetch("/api/account", { method: "DELETE" }); if (!response.ok) throw new Error(); window.location.assign("/"); } catch { toast.error(language === "tr" ? "Hesap silinemedi." : "Unable to delete the account."); setDeleting(false); } };
  return <div className="settings">
    <nav aria-label={t("Settings sections")}>{["Profile", "Preferences", "Subscription", "Data"].map((label) => <button type="button" key={label} onClick={() => document.getElementById(`settings-${label.toLowerCase()}`)?.scrollIntoView({ behavior: "smooth" })}>{t(label)}</button>)}</nav>
    <section>
      <article className="panel settings-card" id="settings-profile">
        <h3>{t("Profile")}</h3><p>{t("Update your personal details.")}</p>
        <div className="avatar"><span>{initials}</span><Button type="button" variant="outline" onClick={() => openUserProfile()}>{t("Change photo")}</Button></div>
        <div className="form-grid"><label>{t("Full name")}<Input value={displayName} readOnly /></label><label>{t("Email")}<Input value={email} readOnly /></label></div>
        <Button type="button" onClick={() => openUserProfile()}>{t("Manage account")}</Button>
      </article>
      <article className="panel settings-card" id="settings-preferences">
        <h3>{t("Preferences")}</h3><p>{t("Customize your default currency.")}</p>
        <div className="setting"><span><b>{t("Currency")}</b><small>{t("Used across balances and reports.")}</small></span><Select value={currency} disabled={savingCurrency} onValueChange={(value) => void saveCurrency(value)}><SelectTrigger aria-label={t("Currency")}><SelectValue /></SelectTrigger><SelectContent>{["TRY", "EUR", "USD", "GBP"].map((item) => <SelectItem value={item} key={item}>{item}</SelectItem>)}</SelectContent></Select></div>
      </article>
      <div id="settings-subscription"><SubscriptionCard /></div>
      <article className="panel settings-card" id="settings-data">
        <h3>{t("Data")}</h3>
        <div className="setting"><span><b>{t("Export data")}</b><small>{t("Download your records as CSV.")}</small></span><Button variant="outline" disabled={exporting} onClick={() => void exportData()}><Download />{exporting ? "…" : t("Export")}</Button></div>
        <div className="setting"><span><b>{t("Delete account")}</b><small>{t("Permanently remove all data.")}</small></span><AlertDialog><AlertDialogTrigger asChild><Button variant="destructive" disabled={deleting}>{t("Delete")}</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t("Delete account")}</AlertDialogTitle><AlertDialogDescription>{t("Deleting your account permanently removes your transactions, accounts, budgets, goals, receipts, conversations, and family memberships. This action cannot be undone.")}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t("Cancel")}</AlertDialogCancel><AlertDialogAction variant="destructive" disabled={deleting} onClick={() => void deleteAccount()}>{deleting ? "…" : t("Delete permanently")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div>
      </article>
    </section>
  </div>;
}

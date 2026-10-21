"use client";

import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { useOwnAvatar } from "@/components/profile/avatar-picker";
import { ProfileEditor } from "@/components/auth/profile-editor";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

import { useCallback, useContext, useEffect, useState } from "react";

import { ChevronRight, Coins, Download, Globe2, LockKeyhole, LogOut, Pencil, Trash2, type LucideIcon } from "lucide-react";

import Link from "next/link";

import { useAuthUser, signOut } from "@/components/providers/auth-provider";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

import { toast } from "sonner";

import { LanguageContext, useT } from "@/components/providers/language-provider";

import { Button } from "@/components/ui/button";

import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { SubscriptionCard } from "@/components/billing/subscription-card";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export function SettingsScreen() {

  const t = useT();

  const { language, setLanguage } = useContext(LanguageContext);

  const tr = language === "tr";

  const { user, loading: userLoading } = useAuthUser();

  const avatar = useOwnAvatar();
  const [signingOut, setSigningOut] = useState(false);

  const [preferencesLoading, setPreferencesLoading] = useState(true);

  const [preferencesError, setPreferencesError] = useState(false);

  const displayName = typeof user?.user_metadata.full_name === "string" && user.user_metadata.full_name.trim() ? user.user_metadata.full_name.trim() : user?.email?.split("@")[0] ?? (tr ? "Hesabım" : "My account");

  const [deleting, setDeleting] = useState(false);

  const [currency, setCurrency] = useState("TRY");

  const [savingCurrency, setSavingCurrency] = useState(false);

  const [exporting, setExporting] = useState(false);

  const loadPreferences = useCallback(async () => {

    try {

      const response = await fetch("/api/account", { cache: "no-store" });

      if (!response.ok) throw new Error();

      const data = await response.json() as { currency?: string };

      if (data.currency) setCurrency(data.currency);

      setPreferencesError(false);

    } catch { setPreferencesError(true); }

    finally { setPreferencesLoading(false); }

  }, []);

  useEffect(() => { const timeout = window.setTimeout(() => void loadPreferences(), 0); return () => window.clearTimeout(timeout); }, [loadPreferences]);

  const saveCurrency = async (value: string) => { const previous = currency; setCurrency(value); setSavingCurrency(true); try { const response = await fetch("/api/account", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currency: value }) }); if (!response.ok) throw new Error(); toast.success(t("Currency updated.")); } catch { setCurrency(previous); toast.error(t("Unable to update account preferences.")); } finally { setSavingCurrency(false); } };

  const exportData = async () => { setExporting(true); try { const response = await fetch("/api/transactions/export?scope=all"); if (!response.ok) throw new Error(); const url = URL.createObjectURL(await response.blob()); const link = document.createElement("a"); link.href = url; link.download = "budgetbuddy-transactions.csv"; link.click(); link.remove(); URL.revokeObjectURL(url); } catch { toast.error(language === "tr" ? "Veriler dışa aktarılamadı." : "Unable to export data."); } finally { setExporting(false); } };

  const deleteAccount = async () => { setDeleting(true); try { const response = await fetch("/api/account", { method: "DELETE" }); if (!response.ok) throw new Error(); await getSupabaseBrowserClient().auth.signOut({ scope: "local" }); window.location.replace("/"); } catch { toast.error(language === "tr" ? "Hesap silinemedi." : "Unable to delete the account."); setDeleting(false); } };

  return <section className="settings-page" aria-labelledby="settings-heading">

    <header className="settings-page-heading"><h2 id="settings-heading">{t("Settings")}</h2><p>{tr ? "Hesabın ve tercihlerin, tek yerde." : "Your account and preferences, in one place."}</p></header>

    <div className="settings-layout">

      <div className="settings-account-column">

        <Dialog><DialogTrigger asChild><button type="button" className="settings-profile-summary" disabled={userLoading} aria-label={tr ? "Profili düzenle" : "Edit profile"}><ProfileAvatar name={displayName} avatar={avatar} className="settings-avatar" /><span className="settings-profile-identity"><b>{userLoading ? (tr ? "Yükleniyor…" : "Loading…") : displayName}</b><small>{user?.email ?? ""}</small></span><Pencil aria-hidden="true" /></button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>{tr ? "Profili düzenle" : "Edit profile"}</DialogTitle><DialogDescription>{t("Update your personal details.")}</DialogDescription></DialogHeader><ProfileEditor showAccountActions={false} /></DialogContent></Dialog>

        <section className="settings-section" aria-labelledby="settings-preferences-title"><h3 id="settings-preferences-title">{tr ? "HESAP VE TERCİHLER" : "Account and preferences"}</h3><div className="settings-group">

          <Link href="/update-password" className="settings-option-row"><SettingsIcon icon={LockKeyhole} /><span className="settings-option-text"><b>{tr ? "Şifreyi değiştir" : "Change password"}</b><small>{tr ? "Hesap güvenliği" : "Account security"}</small></span><ChevronRight aria-hidden="true" /></Link>

          <Select value={currency} disabled={savingCurrency || preferencesLoading || preferencesError} onValueChange={(value) => void saveCurrency(value)}><SelectTrigger className="settings-option-row" aria-label={t("Currency")}><SettingsIcon icon={Coins} /><span className="settings-option-text"><b>{t("Currency")}</b></span><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{["TRY", "EUR", "USD", "GBP"].map((item) => <SelectItem value={item} key={item}>{item}</SelectItem>)}</SelectGroup></SelectContent></Select>

          <Select value={language} onValueChange={setLanguage}><SelectTrigger className="settings-option-row" aria-label={tr ? "Dil" : "Language"}><SettingsIcon icon={Globe2} /><span className="settings-option-text"><b>{tr ? "Dil" : "Language"}</b></span><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="tr">Türkçe</SelectItem><SelectItem value="en">English</SelectItem></SelectGroup></SelectContent></Select>

        </div>{preferencesError && <div className="settings-preferences-error" role="alert"><p>{tr ? "Tercihler yüklenemedi." : "Unable to load preferences."}</p><Button variant="outline" size="sm" onClick={() => { setPreferencesLoading(true); void loadPreferences(); }}>{t("Try again")}</Button></div>}</section>

      </div>

      <div className="settings-data-column">

        <div className="settings-membership"><SubscriptionCard /></div>

        <section className="settings-section" aria-labelledby="settings-data-title"><h3 id="settings-data-title">{tr ? "VERİLERİN" : "Your data"}</h3><div className="settings-group">

          <button type="button" className="settings-option-row" disabled={exporting} onClick={() => void exportData()}><SettingsIcon icon={Download} /><span className="settings-option-text"><b>{exporting ? (tr ? "İndiriliyor…" : "Downloading…") : t("Export data")}</b><small>{tr ? "İşlemlerini CSV olarak indir" : "Download your transactions as CSV"}</small></span><ChevronRight aria-hidden="true" /></button>

          <AlertDialog><AlertDialogTrigger asChild><button type="button" className="settings-option-row settings-delete-row" disabled={deleting}><SettingsIcon icon={Trash2} /><span className="settings-option-text"><b>{t("Delete account")}</b><small>{tr ? "Kalıcı silme işlemi" : "Permanent account deletion"}</small></span><ChevronRight aria-hidden="true" /></button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t("Delete account")}</AlertDialogTitle><AlertDialogDescription>{t("Deleting your account permanently removes your transactions, accounts, budgets, goals, receipts, conversations, and family memberships. This action cannot be undone.")}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t("Cancel")}</AlertDialogCancel><AlertDialogAction variant="destructive" disabled={deleting} onClick={() => void deleteAccount()}>{deleting ? "…" : t("Delete permanently")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

        </div></section>

        <Button variant="outline" className="settings-signout" disabled={signingOut || deleting} onClick={() => { setSigningOut(true); void signOut().catch(() => { toast.error(tr ? "Çıkış yapılamadı." : "Unable to sign out."); setSigningOut(false); }); }}><LogOut data-icon="inline-start" />{signingOut ? (tr ? "Çıkış yapılıyor…" : "Signing out…") : (tr ? "Çıkış yap" : "Sign out")}</Button>

      </div>

    </div>

    <p className="settings-footer">BudgetBuddy</p>

  </section>;

}

function SettingsIcon({ icon: Icon }: { icon: LucideIcon }) {

  return <span className="settings-row-icon" aria-hidden="true"><Icon /></span>;

}

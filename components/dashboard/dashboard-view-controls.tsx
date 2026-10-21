"use client";

import { useContext, useEffect, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Coins, Landmark, SlidersHorizontal, UserRound } from "lucide-react";
import { LanguageContext, useT } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { Currency } from "@/types/finance";

export type DashboardView = { month: string; scope: string; accountId: string; currency: Currency };
type Account = { id: string; name: string; currency: Currency };
type Filters = { accounts: Account[]; familyGroups: { id: string; name: string }[]; currencies: Currency[] };

export function DashboardViewControls({ view, onChange, filters, months }: { view: DashboardView; onChange: (view: DashboardView) => void; filters?: Filters; months: { value: string; label: string }[] }) {
  const t = useT();
  const { language } = useContext(LanguageContext);
  const tr = language === "tr";
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(view);
  const [scopeOptions, setScopeOptions] = useState<{ scope: string; accounts: Account[]; error?: boolean } | null>(null);
  const [retry, setRetry] = useState(0);
  const monthIndex = months.findIndex((item) => item.value === view.month);
  const scopeName = view.scope === "personal" ? t("Personal") : filters?.familyGroups.find((group) => `family:${group.id}` === view.scope)?.name ?? t("Family Group");
  const accountName = view.accountId === "all" ? t("All accounts") : t(filters?.accounts.find((account) => account.id === view.accountId)?.name ?? t("Account"));
  const sameScope = draft.scope === view.scope;
  const optionsReady = sameScope || scopeOptions?.scope === draft.scope;
  const accounts = sameScope ? filters?.accounts ?? [] : scopeOptions?.scope === draft.scope ? scopeOptions.accounts : [];
  const optionsError = !sameScope && scopeOptions?.scope === draft.scope && scopeOptions.error;

  useEffect(() => {
    if (!open || draft.scope === view.scope) return;
    const controller = new AbortController();
    const scope = draft.scope;
    // Fetch only when switching scope: account choices must match the selected family.
    const params = new URLSearchParams({ scope, account: "all" });
    void fetch(`/api/dashboard?${params}`, { cache: "no-store", signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error();
      const payload = await response.json() as { filters: Filters };
      if (!controller.signal.aborted) setScopeOptions({ scope, accounts: payload.filters.accounts });
    }).catch(() => { if (!controller.signal.aborted) setScopeOptions({ scope, accounts: [], error: true }); });
    return () => controller.abort();
  }, [draft.scope, open, retry, view.scope]);

  function changeOpen(next: boolean) {
    if (next) { setDraft(view); setScopeOptions(null); }
    setOpen(next);
  }

  return <section className="view-context" aria-label={t("Dashboard filters")}>
    <div className="view-period"><span><CalendarDays aria-hidden="true" /><b>{months.find((item) => item.value === view.month)?.label ?? view.month}</b></span><div>
      <Button variant="ghost" size="icon" disabled={monthIndex < 0 || monthIndex >= months.length - 1} aria-label={tr ? "Önceki ay" : "Previous month"} onClick={() => onChange({ ...view, month: months[monthIndex + 1].value })}><ChevronLeft /></Button>
      <Button variant="ghost" size="icon" disabled={monthIndex <= 0} aria-label={tr ? "Sonraki ay" : "Next month"} onClick={() => onChange({ ...view, month: months[monthIndex - 1].value })}><ChevronRight /></Button>
    </div></div>
    <div className="view-context-bottom"><div className="view-context-summary" aria-live="polite"><span title={scopeName}><UserRound aria-hidden="true" />{scopeName}</span><span title={accountName}><Landmark aria-hidden="true" />{accountName}</span><span><Coins aria-hidden="true" />{view.currency}</span></div>
      <Sheet open={open} onOpenChange={changeOpen}><SheetTrigger asChild><Button variant="outline" className="view-edit"><SlidersHorizontal data-icon="inline-start" />{tr ? "Görünüm" : "View"}</Button></SheetTrigger>
        <SheetContent side="bottom" className="view-settings-sheet">
          <SheetHeader><SheetTitle>{tr ? "Görünümü düzenle" : "Edit view"}</SheetTitle><SheetDescription>{tr ? "Finansal özetini nasıl görmek istersin?" : "How would you like to see your financial summary?"}</SheetDescription></SheetHeader>
          <div className="view-settings-fields">
            <div><label htmlFor="view-month">{t("Month")}</label><Select value={draft.month} onValueChange={(month) => setDraft((value) => ({ ...value, month }))}><SelectTrigger id="view-month"><CalendarDays /><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{months.map((item) => <SelectItem value={item.value} key={item.value}>{item.label}</SelectItem>)}</SelectGroup></SelectContent></Select></div>
            <div><label htmlFor="view-scope">{t("Scope")}</label><Select value={draft.scope} onValueChange={(scope) => { setScopeOptions(null); setDraft((value) => ({ ...value, scope, accountId: "all" })); }}><SelectTrigger id="view-scope"><UserRound /><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="personal">{t("Personal")}</SelectItem>{filters?.familyGroups.map((group) => <SelectItem value={`family:${group.id}`} key={group.id}>{group.name}</SelectItem>)}</SelectGroup></SelectContent></Select></div>
            <div><label htmlFor="view-account">{t("Account")}</label><Select value={draft.accountId} disabled={!optionsReady || !!optionsError} onValueChange={(accountId) => setDraft((value) => ({ ...value, accountId, currency: accounts.find((account) => account.id === accountId)?.currency ?? value.currency }))}><SelectTrigger id="view-account"><Landmark /><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">{t("All accounts")}</SelectItem>{accounts.map((account) => <SelectItem value={account.id} key={account.id}>{t(account.name)} · {account.currency}</SelectItem>)}</SelectGroup></SelectContent></Select>{!optionsReady && <small role="status">{tr ? "Hesaplar yükleniyor…" : "Loading accounts…"}</small>}{optionsError && <div role="alert"><small>{tr ? "Hesaplar yüklenemedi." : "Unable to load accounts."}</small><Button variant="ghost" size="sm" onClick={() => { setScopeOptions(null); setRetry((value) => value + 1); }}>{t("Try again")}</Button></div>}</div>
            <div><label htmlFor="view-currency">{t("Currency")}</label><Select value={draft.currency} disabled={draft.accountId !== "all"} onValueChange={(currency) => setDraft((value) => ({ ...value, currency: currency as Currency }))}><SelectTrigger id="view-currency"><Coins /><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{(filters?.currencies ?? ["TRY", "EUR", "USD", "GBP"]).map((currency) => <SelectItem value={currency} key={currency}>{currency}</SelectItem>)}</SelectGroup></SelectContent></Select>{draft.accountId !== "all" && <small>{tr ? "Seçilen hesabın para birimi kullanılır." : "Uses the selected account’s currency."}</small>}</div>
          </div>
          <SheetFooter className="view-settings-footer"><Button variant="outline" onClick={() => { setScopeOptions(null); setDraft({ month: months[0].value, scope: "personal", accountId: "all", currency: "TRY" }); }}>{tr ? "Sıfırla" : "Reset"}</Button><Button disabled={!optionsReady || !!optionsError} onClick={() => { onChange(draft); setOpen(false); }}>{tr ? "Görünümü uygula" : "Apply view"}</Button></SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  </section>;
}

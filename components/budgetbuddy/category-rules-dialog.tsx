"use client";

import { useCallback, useContext, useEffect, useState } from "react";
import { Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { LanguageContext } from "@/components/providers/language-provider";
import { categoryDisplayName } from "@/lib/finance/category-names";
import type { TransactionKind } from "@/lib/finance/category-rules";

type Rule = { id: string; keyword: string; type: TransactionKind; categoryId: string; categoryName: string };
type Category = { id: string; name: string; type: TransactionKind };
type Data = { available: boolean; rules: Rule[]; categories: Category[] };

const selectClass = "h-9 rounded-md border border-[#dfe3ed] bg-white px-3";

export function CategoryRulesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { language } = useContext(LanguageContext);
  const tr = language === "tr";
  const [data, setData] = useState<Data | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [type, setType] = useState<TransactionKind>("expense");
  const [categoryId, setCategoryId] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/category-rules", { cache: "no-store" });
      if (!response.ok) throw new Error();
      setData(await response.json() as Data); setLoadError(false);
    } catch { setLoadError(true); }
  }, []);
  useEffect(() => { if (open) { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); } }, [open, load]);

  async function request(url: string, method: "POST" | "DELETE", body?: Record<string, unknown>) {
    setBusy(true);
    try {
      const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
      if (!response.ok) { const result = await response.json().catch(() => ({})) as { error?: string }; throw new Error(result.error || "Request failed"); }
      await load(); return true;
    } catch (error) { toast.error(error instanceof Error ? error.message : (tr ? "İşlem başarısız." : "Action failed.")); return false; }
    finally { setBusy(false); }
  }

  async function add(event: React.FormEvent) {
    event.preventDefault();
    if (await request("/api/category-rules", "POST", { keyword, type, categoryId })) {
      setKeyword(""); toast.success(tr ? "Kural eklendi." : "Rule added.");
    }
  }

  const categories = (data?.categories ?? []).filter((category) => category.type === type);

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{tr ? "Kategori kuralları" : "Category rules"}</DialogTitle>
        <DialogDescription>{tr ? "Açıklamada bu sözcük geçerse işlem otomatik olarak seçtiğin kategoriye girer. CSV aktarırken ve yeni işlem eklerken çalışır." : "When a description contains this word, the transaction gets the category you pick. Used when importing a CSV and when adding a transaction."}</DialogDescription>
      </DialogHeader>
      {loadError ? <p role="alert" className="form-error">{tr ? "Kurallar yüklenemedi." : "Unable to load the rules."}</p>
        : !data ? <p>{tr ? "Yükleniyor…" : "Loading…"}</p>
        : !data.available ? <p>{tr ? "Bu özellik henüz hazır değil." : "This feature is not ready yet."}</p>
        : <>
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={(event) => void add(event)}>
            <label className="grid gap-1 text-sm font-semibold sm:col-span-2">{tr ? "Açıklamada geçen sözcük" : "Word in the description"}<Input value={keyword} minLength={2} maxLength={80} required placeholder={tr ? "Örn. Migros" : "E.g. Migros"} onChange={(event) => setKeyword(event.target.value)} /></label>
            <label className="grid gap-1 text-sm font-semibold">{tr ? "Tür" : "Type"}<select className={selectClass} value={type} onChange={(event) => { setType(event.target.value as TransactionKind); setCategoryId(""); }}><option value="expense">{tr ? "Gider" : "Expense"}</option><option value="income">{tr ? "Gelir" : "Income"}</option></select></label>
            <label className="grid gap-1 text-sm font-semibold">{tr ? "Kategori" : "Category"}<select className={selectClass} value={categoryId} required onChange={(event) => setCategoryId(event.target.value)}><option value="">{tr ? "Seç…" : "Choose…"}</option>{categories.map((category) => <option key={category.id} value={category.id}>{categoryDisplayName(category.name, language)}</option>)}</select></label>
            <Button type="submit" disabled={busy || keyword.trim().length < 2 || !categoryId} className="sm:col-span-2"><Wand2 data-icon="inline-start" />{tr ? "Kural ekle" : "Add rule"}</Button>
          </form>
          {data.rules.length === 0 ? <p className="text-sm text-[#66708b]">{tr ? "Henüz kural yok." : "No rules yet."}</p>
            : <ul className="grid max-h-60 gap-2 overflow-y-auto">{data.rules.map((rule) => <li key={rule.id} className="flex items-center gap-2 rounded-lg border border-[#e6e9f2] px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-sm"><b>{rule.keyword}</b> → {categoryDisplayName(rule.categoryName, language)}<small className="ml-2 text-[#66708b]">{rule.type === "income" ? (tr ? "Gelir" : "Income") : (tr ? "Gider" : "Expense")}</small></span>
              <Button variant="ghost" size="icon" disabled={busy} aria-label={tr ? "Kuralı sil" : "Delete rule"} onClick={() => void request(`/api/category-rules/${rule.id}`, "DELETE")}><Trash2 /></Button>
            </li>)}</ul>}
        </>}
    </DialogContent>
  </Dialog>;
}

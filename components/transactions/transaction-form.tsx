"use client";

import { useContext, useEffect, useState } from "react";
import { notifyFinanceDataChanged } from "@/lib/finance/data-events";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Minus, Plus, ReceiptText, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { transactionSchema, type TransactionInput } from "@/validations/transaction";
import { LanguageContext, useT } from "@/components/providers/language-provider";
import { matchCategoryRule, type CategoryRule } from "@/lib/finance/category-rules";
import type { StoredTransaction, TransactionOption } from "@/types/finance";

const NO_ACCOUNT = "none";

interface TransactionFormProps {
  transaction?: StoredTransaction;
  onSuccess?: () => void;
  familyGroupId?: string;
  initialDraft?: Partial<Pick<TransactionInput, "type" | "amount" | "title" | "date" | "note">>;
}

export function TransactionForm({ transaction, onSuccess, familyGroupId, initialDraft }: TransactionFormProps) {
  const t = useT();
  const { language } = useContext(LanguageContext);
  const tr = language === "tr";
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [type, setType] = useState<TransactionInput["type"]>(transaction?.type ?? initialDraft?.type ?? "expense");
  const [category, setCategory] = useState(transaction?.categoryId ?? "");
  const [account, setAccount] = useState(transaction?.accountId ?? "");
  const [accounts, setAccounts] = useState<TransactionOption[]>([]);
  const [categories, setCategories] = useState<TransactionOption[]>([]);
  const [optionsError, setOptionsError] = useState<string>();
  const [rules, setRules] = useState<CategoryRule[]>([]);
  const [pickedByRule, setPickedByRule] = useState(false);
  const [hasStoredReceipt, setHasStoredReceipt] = useState(Boolean(transaction?.hasReceipt));
  const [isRemovingReceipt, setIsRemovingReceipt] = useState(false);
  // Kept until a create succeeds, so a retry after a lost response is not stored twice.
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const form = useForm<TransactionInput>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: transaction?.type ?? initialDraft?.type ?? "expense",
      amount: transaction?.amount ?? initialDraft?.amount,
      title: transaction?.title ?? initialDraft?.title ?? "",
      category: transaction?.categoryId ?? "",
      account: transaction?.accountId ?? "",
      date: transaction?.transactionDate ?? initialDraft?.date ?? new Date().toISOString().slice(0, 10),
      note: transaction?.note ?? initialDraft?.note ?? "",
    },
  });

  useEffect(() => {
    const controller = new AbortController();

    async function loadOptions() {
      try {
        const response = await fetch("/api/transactions", { signal: controller.signal });
        const payload = await response.json() as { accounts: TransactionOption[]; categories: TransactionOption[]; error?: string };
        if (!response.ok) throw new Error(payload.error);
        setAccounts(payload.accounts);
        setCategories(payload.categories);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setOptionsError(tr ? "Hesaplar ve kategoriler yüklenemedi." : "Unable to load accounts and categories.");
      }
    }

    void loadOptions();
    return () => controller.abort();
  }, [tr]);

  useEffect(() => {
    if (transaction) return;
    const controller = new AbortController();
    fetch("/api/category-rules", { signal: controller.signal })
      .then((response) => response.ok ? response.json() as Promise<{ available?: boolean; rules?: CategoryRule[] }> : null)
      .then((payload) => { if (payload?.available && payload.rules) setRules(payload.rules); })
      .catch(() => undefined);
    return () => controller.abort();
  }, [transaction]);

  /** Picks the category from the user's rules while they type, until they choose one themselves. */
  function applyRule(title: string, kind: TransactionInput["type"]) {
    if (transaction || (category && !pickedByRule)) return;
    const rule = matchCategoryRule(title, kind, rules);
    if (rule) {
      setCategory(rule.categoryId);
      form.setValue("category", rule.categoryId, { shouldValidate: true });
      setPickedByRule(true);
    } else if (pickedByRule) {
      setCategory("");
      form.setValue("category", "", { shouldValidate: false });
      setPickedByRule(false);
    }
  }

  async function submit(values: TransactionInput) {
    setIsSubmitting(true);
    try {
      const response = await fetch(transaction ? `/api/transactions/${transaction.id}` : "/api/transactions", {
        method: transaction ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", ...(transaction ? {} : { "Idempotency-Key": requestId }) },
        body: JSON.stringify({ ...values, familyGroupId }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string; transaction?: StoredTransaction };
      if (!response.ok) throw new Error(payload.error);

      toast.success(transaction
        ? (tr ? "İşlem güncellendi." : "Transaction updated.")
        : (tr ? "İşlem başarıyla eklendi." : "Transaction added successfully."));
      if (!transaction) {
        setRequestId(crypto.randomUUID());
        form.reset({ ...values, amount: undefined, title: "", note: "" });
        setCategory("");
      }
      notifyFinanceDataChanged();
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error && error.message
        ? error.message
        : (tr ? "İşlem kaydedilemedi." : "Unable to save the transaction."));
    } finally {
      setIsSubmitting(false);
    }
  }

  const titleField = form.register("title");
  /** After switching income/expense the category is cleared; try the rules again for the title already typed. */
  function applyRuleAfterTypeChange(kind: TransactionInput["type"]) {
    const rule = transaction ? null : matchCategoryRule(form.getValues("title"), kind, rules);
    if (!rule) return;
    setCategory(rule.categoryId);
    form.setValue("category", rule.categoryId, { shouldValidate: true });
    setPickedByRule(true);
  }
  const availableCategories = categories.filter((item) => !item.type || item.type === type);
  const removeStoredReceipt = async () => {
    if (!transaction) return;
    setIsRemovingReceipt(true);
    try {
      const response = await fetch(`/api/transactions/${transaction.id}/receipt`, { method: "DELETE" });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error);
      setHasStoredReceipt(false);
      toast.success(tr ? "Fiş görseli kaldırıldı." : "Receipt image removed.");
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : (tr ? "Fiş görseli kaldırılamadı." : "Unable to remove receipt image."));
    } finally { setIsRemovingReceipt(false); }
  };

  return (
    <form className="modal transaction-form" onSubmit={form.handleSubmit(submit)} noValidate>
      <fieldset className="transaction-type-picker">
        <legend>{tr ? "İşlem türünü seçin" : "Choose transaction type"}</legend>
        {(["expense", "income"] as const).map((value) => (
          <button
            aria-pressed={type === value}
            className={`${value} ${type === value ? "active" : ""}`}
            key={value}
            onClick={() => { setType(value); setCategory(""); setPickedByRule(false); form.setValue("type", value, { shouldValidate: true }); form.setValue("category", "", { shouldValidate: true }); applyRuleAfterTypeChange(value); }}
            type="button"
          >
            <i>{value === "expense" ? <Minus /> : <Plus />}</i>
            <span>
              <strong>{value === "expense" ? (tr ? "Gider" : "Expense") : (tr ? "Gelir" : "Income")}</strong>
              <small>{value === "expense" ? (tr ? "Bakiyeden düşülür" : "Subtracts from balance") : (tr ? "Bakiyeye eklenir" : "Adds to balance")}</small>
            </span>
          </button>
        ))}
      </fieldset>
      <p className={`transaction-type-result ${type}`} role="status">
        {type === "expense" ? (tr ? "− Bu işlem harcama olarak sayılacak." : "− This transaction will count as spending.") : (tr ? "+ Bu işlem kazanç olarak sayılacak." : "+ This transaction will count as income.")}
      </p>

      <label>
        {tr ? "Tutar" : "Amount"}
        <Input inputMode="decimal" placeholder="₺0.00" {...form.register("amount")} aria-invalid={!!form.formState.errors.amount} />
        {form.formState.errors.amount && <small className="field-error">{form.formState.errors.amount.message}</small>}
      </label>
      <label>
        {tr ? "Açıklama" : "Description"}
        <Input placeholder={tr ? "Haftalık market alışverişi" : "Weekly groceries"} {...titleField} onChange={(event) => { void titleField.onChange(event); applyRule(event.target.value, type); }} aria-invalid={!!form.formState.errors.title} />
        {form.formState.errors.title && <small className="field-error">{form.formState.errors.title.message}</small>}
      </label>
      {hasStoredReceipt && <div className="receipt-field">
        <p className="receipt-visibility"><ReceiptText />{tr ? "Bu işlemde kayıtlı bir fiş görseli var." : "This transaction already has a saved receipt image."}<button type="button" disabled={isRemovingReceipt} onClick={() => void removeStoredReceipt()}><Trash2 />{isRemovingReceipt ? (tr ? "Kaldırılıyor…" : "Removing…") : (tr ? "Kaldır" : "Remove")}</button></p>
      </div>}
      <div className="form-grid tx-pair">
        <label>
          {tr ? "Kategori" : "Category"}
          <Select onValueChange={(value) => { setCategory(value); setPickedByRule(false); form.setValue("category", value, { shouldValidate: true }); }} value={category}>
            <SelectTrigger aria-invalid={!!form.formState.errors.category}><SelectValue placeholder={tr ? "Kategori seç" : "Select category"} /></SelectTrigger>
            <SelectContent>{availableCategories.map((item) => <SelectItem value={item.id} key={item.id}>{t(item.name)}</SelectItem>)}</SelectContent>
          </Select>
          {pickedByRule && <small>{tr ? "Kategori kurallarına göre seçildi." : "Picked from your category rules."}</small>}
          {form.formState.errors.category && <small className="field-error">{form.formState.errors.category.message}</small>}
        </label>
        <label>
          {tr ? "Hesap (isteğe bağlı)" : "Account (optional)"}
          <Select onValueChange={(value) => { const next = value === NO_ACCOUNT ? "" : value; setAccount(next); form.setValue("account", next, { shouldValidate: true }); }} value={account || NO_ACCOUNT}>
            <SelectTrigger aria-invalid={!!form.formState.errors.account}><SelectValue placeholder={tr ? "Hesap seç" : "Select account"} /></SelectTrigger>
            <SelectContent><SelectItem value={NO_ACCOUNT}>{tr ? "Hesap yok" : "No account"}</SelectItem>{accounts.map((item) => <SelectItem value={item.id} key={item.id}>{t(item.name)}</SelectItem>)}</SelectContent>
          </Select>
          {form.formState.errors.account && <small className="field-error">{form.formState.errors.account.message}</small>}
        </label>
      </div>
      <label>
        {tr ? "Tarih" : "Date"}
        <Input type="date" {...form.register("date")} aria-invalid={!!form.formState.errors.date} />
        {form.formState.errors.date && <small className="field-error">{form.formState.errors.date.message}</small>}
      </label>
      <label>
        {tr ? "Not" : "Note"} <small>{tr ? "İsteğe bağlı" : "Optional"}</small>
        <Input placeholder={tr ? "İsteğe bağlı not" : "Optional note"} {...form.register("note")} />
        {form.formState.errors.note && <small className="field-error">{form.formState.errors.note.message}</small>}
      </label>
      {optionsError && <p className="field-error" role="alert">{optionsError}</p>}
      <Button disabled={isSubmitting} type="submit">
        {isSubmitting ? (tr ? "Kaydediliyor…" : "Saving…") : transaction ? (tr ? "Değişiklikleri kaydet" : "Save changes") : type === "expense" ? (tr ? "− Gider ekle" : "− Add expense") : (tr ? "+ Gelir ekle" : "+ Add income")}
      </Button>
    </form>
  );
}

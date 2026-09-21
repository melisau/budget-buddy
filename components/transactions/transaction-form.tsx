"use client";

import { useContext, useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImagePlus, Minus, Plus, ReceiptText, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { transactionSchema, type TransactionInput } from "@/validations/transaction";
import { LanguageContext, useT } from "@/components/providers/language-provider";
import type { StoredTransaction, TransactionOption } from "@/types/finance";

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
  const [receipt, setReceipt] = useState<File>();
  const [hasStoredReceipt, setHasStoredReceipt] = useState(Boolean(transaction?.hasReceipt));
  const [isRemovingReceipt, setIsRemovingReceipt] = useState(false);
  const [receiptInputKey, setReceiptInputKey] = useState(0);
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

  async function submit(values: TransactionInput) {
    setIsSubmitting(true);
    try {
      const response = await fetch(transaction ? `/api/transactions/${transaction.id}` : "/api/transactions", {
        method: transaction ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, familyGroupId }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string; transaction?: StoredTransaction };
      if (!response.ok) throw new Error(payload.error);

      const transactionId = transaction?.id ?? payload.transaction?.id;
      if (receipt && transactionId) {
        const formData = new FormData();
        formData.append("receipt", receipt);
        const receiptResponse = await fetch(`/api/transactions/${transactionId}/receipt`, { method: "POST", body: formData });
        const receiptPayload = await receiptResponse.json().catch(() => ({})) as { error?: string };
        if (!receiptResponse.ok) throw new Error(receiptPayload.error);
      }

      toast.success(transaction
        ? (tr ? "İşlem güncellendi." : "Transaction updated.")
        : (tr ? "İşlem başarıyla eklendi." : "Transaction added successfully."));
      if (!transaction) {
        form.reset({ ...values, amount: undefined, title: "", note: "" });
        setCategory("");
        setReceipt(undefined);
        setReceiptInputKey((current) => current + 1);
      }
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error && error.message
        ? error.message
        : (tr ? "İşlem kaydedilemedi." : "Unable to save the transaction."));
    } finally {
      setIsSubmitting(false);
    }
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
            onClick={() => { setType(value); setCategory(""); form.setValue("type", value, { shouldValidate: true }); form.setValue("category", "", { shouldValidate: true }); }}
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
        <Input placeholder={tr ? "Haftalık market alışverişi" : "Weekly groceries"} {...form.register("title")} aria-invalid={!!form.formState.errors.title} />
        {form.formState.errors.title && <small className="field-error">{form.formState.errors.title.message}</small>}
      </label>
      <div className="receipt-field">
        <div><b>{tr ? "Fiş görseli" : "Receipt image"}</b><small>{tr ? "JPG, PNG veya WEBP · en fazla 5 MB" : "JPG, PNG, or WEBP · up to 5 MB"}</small></div>
        <label className="receipt-upload"><ImagePlus /><span><b>{receipt ? receipt.name : (tr ? "Görsel seç" : "Choose image")}</b><small>{tr ? "Kamera veya galeriden ekleyin" : "Add it from your camera or gallery"}</small></span><Input key={receiptInputKey} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => setReceipt(event.target.files?.[0])} /></label>
        {hasStoredReceipt && !receipt && <p className="receipt-visibility"><ReceiptText />{tr ? "Bu işlemde kayıtlı bir fiş görseli var." : "This transaction already has a saved receipt image."}<button type="button" disabled={isRemovingReceipt} onClick={() => void removeStoredReceipt()}><Trash2 />{isRemovingReceipt ? (tr ? "Kaldırılıyor…" : "Removing…") : (tr ? "Kaldır" : "Remove")}</button></p>}
        {receipt && <p className="receipt-visibility"><ReceiptText />{tr ? "Görsel işlem kaydedildikten sonra güvenli olarak yüklenecek." : "The image will upload securely after the transaction is saved."}<button type="button" onClick={() => { setReceipt(undefined); setReceiptInputKey((current) => current + 1); }}><Trash2 />{tr ? "Kaldır" : "Remove"}</button></p>}
      </div>
      <div className="form-grid">
        <label>
          {tr ? "Kategori" : "Category"}
          <Select onValueChange={(value) => { setCategory(value); form.setValue("category", value, { shouldValidate: true }); }} value={category}>
            <SelectTrigger aria-invalid={!!form.formState.errors.category}><SelectValue placeholder={tr ? "Kategori seç" : "Select category"} /></SelectTrigger>
            <SelectContent>{availableCategories.map((item) => <SelectItem value={item.id} key={item.id}>{t(item.name)}</SelectItem>)}</SelectContent>
          </Select>
          {form.formState.errors.category && <small className="field-error">{form.formState.errors.category.message}</small>}
        </label>
        <label>
          {tr ? "Hesap" : "Account"}
          <Select onValueChange={(value) => { setAccount(value); form.setValue("account", value, { shouldValidate: true }); }} value={account}>
            <SelectTrigger aria-invalid={!!form.formState.errors.account}><SelectValue placeholder={tr ? "Hesap seç" : "Select account"} /></SelectTrigger>
            <SelectContent>{accounts.map((item) => <SelectItem value={item.id} key={item.id}>{t(item.name)}</SelectItem>)}</SelectContent>
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

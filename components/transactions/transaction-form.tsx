"use client";

import { useContext, useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { transactionSchema, type TransactionInput } from "@/validations/transaction";
import { LanguageContext } from "@/components/providers/language-provider";
import type { StoredTransaction, TransactionOption } from "@/types/finance";

interface TransactionFormProps {
  transaction?: StoredTransaction;
  onSuccess?: () => void;
  familyGroupId?: string;
  familyMembers?: { userId: string; name: string }[];
}

export function TransactionForm({ transaction, onSuccess, familyGroupId, familyMembers = [] }: TransactionFormProps) {
  const { language } = useContext(LanguageContext);
  const tr = language === "tr";
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [type, setType] = useState<TransactionInput["type"]>(transaction?.type ?? "expense");
  const [category, setCategory] = useState(transaction?.categoryId ?? "");
  const [account, setAccount] = useState(transaction?.accountId ?? "");
  const [accounts, setAccounts] = useState<TransactionOption[]>([]);
  const [categories, setCategories] = useState<TransactionOption[]>([]);
  const [optionsError, setOptionsError] = useState<string>();
  const [ownerUserId, setOwnerUserId] = useState(familyMembers[0]?.userId ?? "");
  const form = useForm<TransactionInput>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: transaction?.type ?? "expense",
      amount: transaction?.amount,
      title: transaction?.title ?? "",
      category: transaction?.categoryId ?? "",
      account: transaction?.accountId ?? "",
      date: transaction?.transactionDate ?? "2026-09-10",
      note: transaction?.note ?? "",
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
        body: JSON.stringify({ ...values, familyGroupId, ownerUserId: familyGroupId && ownerUserId ? ownerUserId : undefined }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error);

      toast.success(transaction
        ? (tr ? "İşlem güncellendi." : "Transaction updated.")
        : (tr ? "İşlem başarıyla eklendi." : "Transaction added successfully."));
      if (!transaction) {
        form.reset({ ...values, amount: undefined, title: "", note: "" });
        setCategory("");
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

  return (
    <form className="modal" onSubmit={form.handleSubmit(submit)} noValidate>
      <div className="type" aria-label={tr ? "İşlem türü" : "Transaction type"}>
        {(["expense", "income"] as const).map((value) => (
          <button
            aria-pressed={type === value}
            className={type === value ? "active" : ""}
            key={value}
            onClick={() => { setType(value); setCategory(""); form.setValue("type", value, { shouldValidate: true }); form.setValue("category", "", { shouldValidate: true }); }}
            type="button"
          >
            {value === "expense" ? (tr ? "Gider" : "Expense") : (tr ? "Gelir" : "Income")}
          </button>
        ))}
      </div>

      <label>
        {tr ? "Tutar" : "Amount"}
        <Input inputMode="decimal" placeholder="₺0.00" {...form.register("amount")} aria-invalid={!!form.formState.errors.amount} />
        {form.formState.errors.amount && <small className="field-error">{form.formState.errors.amount.message}</small>}
      </label>
      {familyGroupId && <label>
        {tr ? "İşlem sahibi" : "Transaction owner"}
        <Select onValueChange={setOwnerUserId} value={ownerUserId}>
          <SelectTrigger><SelectValue placeholder={tr ? "Aile bireyi seç" : "Select a family member"} /></SelectTrigger>
          <SelectContent>{familyMembers.map((member) => <SelectItem value={member.userId} key={member.userId}>{member.name}</SelectItem>)}</SelectContent>
        </Select>
      </label>}
      <label>
        {tr ? "Açıklama" : "Description"}
        <Input placeholder={tr ? "Haftalık market alışverişi" : "Weekly groceries"} {...form.register("title")} aria-invalid={!!form.formState.errors.title} />
        {form.formState.errors.title && <small className="field-error">{form.formState.errors.title.message}</small>}
      </label>
      <div className="form-grid">
        <label>
          {tr ? "Kategori" : "Category"}
          <Select onValueChange={(value) => { setCategory(value); form.setValue("category", value, { shouldValidate: true }); }} value={category}>
            <SelectTrigger aria-invalid={!!form.formState.errors.category}><SelectValue placeholder={tr ? "Kategori seç" : "Select category"} /></SelectTrigger>
            <SelectContent>{availableCategories.map((item) => <SelectItem value={item.id} key={item.id}>{item.name}</SelectItem>)}</SelectContent>
          </Select>
          {form.formState.errors.category && <small className="field-error">{form.formState.errors.category.message}</small>}
        </label>
        <label>
          {tr ? "Hesap" : "Account"}
          <Select onValueChange={(value) => { setAccount(value); form.setValue("account", value, { shouldValidate: true }); }} value={account}>
            <SelectTrigger aria-invalid={!!form.formState.errors.account}><SelectValue placeholder={tr ? "Hesap seç" : "Select account"} /></SelectTrigger>
            <SelectContent>{accounts.map((item) => <SelectItem value={item.id} key={item.id}>{item.name}</SelectItem>)}</SelectContent>
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
        {isSubmitting ? (tr ? "Kaydediliyor…" : "Saving…") : transaction ? (tr ? "Değişiklikleri kaydet" : "Save changes") : (tr ? "İşlem ekle" : "Add transaction")}
      </Button>
    </form>
  );
}

"use client";

import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Check, Download, FileSpreadsheet, Pencil, ReceiptText, Search, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { AddTransaction } from "@/components/budgetbuddy/shared";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { LanguageContext, useT } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { StoredTransaction, TransactionOption, TransactionType } from "@/types/finance";
import { formatNumber } from "@/lib/finance/currency";
import { parseTransactionCsv, type CsvParseResult } from "@/lib/finance/csv-import";

type TransactionData = {
  transactions: StoredTransaction[];
  accounts: TransactionOption[];
  categories: TransactionOption[];
};

const initialData: TransactionData = { transactions: [], accounts: [], categories: [] };

export function TransactionsScreen() {
  const t = useT();
  const { language } = useContext(LanguageContext);
  const [data, setData] = useState<TransactionData>(initialData);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | TransactionType>("all");
  const [accountFilter, setAccountFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const loadTransactions = useCallback(async () => {
    setLoadError(undefined);
    try {
      const response = await fetch("/api/transactions", { cache: "no-store" });
      const payload = await response.json() as TransactionData & { error?: string };
      if (!response.ok) throw new Error(payload.error);
      setData(payload);
    } catch (error) {
      setLoadError(error instanceof Error && error.message ? error.message : (language === "tr" ? "İşlemler yüklenemedi." : "Unable to load transactions."));
    } finally {
      setIsLoading(false);
    }
  }, [language]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadTransactions(), 0);
    return () => window.clearTimeout(timer);
  }, [loadTransactions]);

  const filteredTransactions = useMemo(() => {
    const locale = language === "tr" ? "tr-TR" : "en-US";
    const normalizedQuery = query.trim().toLocaleLowerCase(locale);
    return data.transactions.filter((transaction) => {
      const matchesSearch = !normalizedQuery || [transaction.title, transaction.category, transaction.accountName]
        .some((value) => value.toLocaleLowerCase(locale).includes(normalizedQuery));
      return matchesSearch
        && (typeFilter === "all" || transaction.type === typeFilter)
        && (accountFilter === "all" || transaction.accountId === accountFilter)
        && (categoryFilter === "all" || transaction.categoryId === categoryFilter)
        && (!fromDate || transaction.transactionDate >= fromDate)
        && (!toDate || transaction.transactionDate <= toDate);
    });
  }, [accountFilter, categoryFilter, data.transactions, fromDate, language, query, toDate, typeFilter]);

  const hasFilters = Boolean(query || typeFilter !== "all" || accountFilter !== "all" || categoryFilter !== "all" || fromDate || toDate);

  return <>
    <div className="toolbar transaction-toolbar">
      <div><Search /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("Search transactions")} aria-label={t("Search transactions")} /></div>
      <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as "all" | TransactionType)}><SelectTrigger aria-label={t("Transaction type")}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{t("All types")}</SelectItem><SelectItem value="expense">{t("Expense")}</SelectItem><SelectItem value="income">{t("Income")}</SelectItem></SelectContent></Select>
      <Select value={accountFilter} onValueChange={setAccountFilter}><SelectTrigger aria-label={t("Account")}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{t("All accounts")}</SelectItem>{data.accounts.map((account) => <SelectItem value={account.id} key={account.id}>{account.name}</SelectItem>)}</SelectContent></Select>
      <Select value={categoryFilter} onValueChange={setCategoryFilter}><SelectTrigger aria-label={t("Category")}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{t("All categories")}</SelectItem>{data.categories.map((category) => <SelectItem value={category.id} key={category.id}>{t(category.name)}</SelectItem>)}</SelectContent></Select>
      <Input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} aria-label={t("From date")} />
      <Input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} aria-label={t("To date")} />
      <CsvExport />
      <CsvImport onImported={loadTransactions} />
      <AddTransaction onCreated={() => void loadTransactions()} />
    </div>
    {loadError && <div className="panel empty-state"><p role="alert">{loadError}</p><Button onClick={() => void loadTransactions()}>{t("Try again")}</Button></div>}
    {isLoading && <div className="panel empty-state"><p>{t("Loading transactions…")}</p></div>}
    {!isLoading && !loadError && filteredTransactions.length ? <article className="panel tx-table">
      <header><span>{t("Transaction")}</span><span>{t("Category")}</span><span>{t("Date")}</span><span>{t("Account")}</span><span>{t("Amount")}</span><span>{t("Actions")}</span></header>
      {filteredTransactions.map((transaction) => <div className="tx-row" key={transaction.id}>
        <b>{transaction.title}</b><span>{t(transaction.category)}</span><span>{formatTransactionDate(transaction.transactionDate, language)}</span><span>{transaction.accountName}</span>
        <strong className={transaction.type === "income" ? "pos" : "neg"}>{transaction.type === "income" ? "+" : "−"}₺{formatNumber(transaction.amount, language)}</strong>
        <TransactionActions transaction={transaction} onChanged={loadTransactions} />
      </div>)}
    </article> : !isLoading && !loadError && <Empty className="panel empty-state"><EmptyHeader><EmptyMedia variant="icon"><Search /></EmptyMedia><EmptyTitle>{hasFilters ? t("No matching transactions") : t("No transactions yet")}</EmptyTitle><EmptyDescription>{hasFilters ? t("Try a different search, or add your first income or expense.") : t("Add your first income or expense to start tracking your money.")}</EmptyDescription></EmptyHeader><EmptyContent><AddTransaction onCreated={() => void loadTransactions()} /></EmptyContent></Empty>}
  </>;
}

function CsvExport() {
  const { language } = useContext(LanguageContext);
  const [scope, setScope] = useState<"personal" | "family">("personal");
  const [isDownloading, setIsDownloading] = useState(false);
  const download = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(`/api/transactions/export?scope=${scope}`);
      if (!response.ok) { const payload = await response.json().catch(() => ({})) as { error?: string }; throw new Error(payload.error); }
      const blob = await response.blob(); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `budgetbuddy-${scope}-transactions.csv`; link.click(); URL.revokeObjectURL(url);
    } catch (error) { toast.error(error instanceof Error && error.message ? error.message : (language === "tr" ? "CSV dışa aktarılamadı." : "Unable to export CSV.")); } finally { setIsDownloading(false); }
  };
  return <div className="csv-export"><Select value={scope} onValueChange={(value) => setScope(value as "personal" | "family")}><SelectTrigger aria-label={language === "tr" ? "Dışa aktarma kapsamı" : "Export scope"}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="personal">{language === "tr" ? "Kişisel" : "Personal"}</SelectItem><SelectItem value="family">{language === "tr" ? "Aile" : "Family"}</SelectItem></SelectContent></Select><Button variant="outline" disabled={isDownloading} onClick={() => void download()}><Download />{language === "tr" ? "CSV dışa aktar" : "Export CSV"}</Button></div>;
}

function TransactionActions({ transaction, onChanged }: { transaction: StoredTransaction; onChanged: () => Promise<void> }) {
  const t = useT();
  const { language } = useContext(LanguageContext);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function removeTransaction() {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/transactions/${transaction.id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(payload.error);
      }
      toast.success(language === "tr" ? "İşlem silindi." : "Transaction deleted.");
      await onChanged();
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : (language === "tr" ? "İşlem silinemedi." : "Unable to delete the transaction."));
    } finally {
      setIsDeleting(false);
    }
  }

  return <div className="tx-actions">
    {transaction.hasReceipt && <ReceiptLink transactionId={transaction.id} language={language} />}
    <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}><DialogTrigger asChild><Button variant="ghost" size="sm" aria-label={t("Edit transaction")}><Pencil />{t("Edit")}</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>{t("Edit transaction")}</DialogTitle><DialogDescription>{t("Update the transaction details.")}</DialogDescription></DialogHeader><TransactionForm key={transaction.id} transaction={transaction} onSuccess={() => { setIsEditOpen(false); void onChanged(); }} /></DialogContent></Dialog>
    <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="sm" disabled={isDeleting} aria-label={t("Delete transaction")}><Trash2 />{t("Delete")}</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t("Delete this transaction?")}</AlertDialogTitle><AlertDialogDescription>{t("This action cannot be undone.")}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t("Cancel")}</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={() => void removeTransaction()}>{t("Delete")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}

function ReceiptLink({ transactionId, language }: { transactionId: string; language: "tr" | "en" }) {
  const [isOpening, setIsOpening] = useState(false);
  const openReceipt = async () => {
    setIsOpening(true);
    try {
      const response = await fetch(`/api/transactions/${transactionId}/receipt`, { cache: "no-store" });
      const payload = await response.json() as { url?: string; error?: string };
      if (!response.ok || !payload.url) throw new Error(payload.error);
      window.open(payload.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : (language === "tr" ? "Fiş görseli açılamadı." : "Unable to open receipt image."));
    } finally { setIsOpening(false); }
  };
  return <Button variant="ghost" size="sm" disabled={isOpening} onClick={() => void openReceipt()}><ReceiptText />{language === "tr" ? "Fiş" : "Receipt"}</Button>;
}

function formatTransactionDate(value: string, language: "en" | "tr") {
  return new Intl.DateTimeFormat(language === "tr" ? "tr-TR" : "en-US", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00Z`));
}

function CsvImport({ onImported }: { onImported: () => Promise<void> }) {
  const t = useT();
  const { language } = useContext(LanguageContext);
  const fileInput = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [fileName, setFileName] = useState<string>();
  const [parseResult, setParseResult] = useState<CsvParseResult>();
  const [fileError, setFileError] = useState<string>();
  const [isImporting, setIsImporting] = useState(false);
  const mappingRows = language === "tr"
    ? ["Tarih → İşlem tarihi", "Açıklama → Satıcı / Açıklama", "Tutar → İşlem tutarı", "Tür → Gider / Gelir", "Kategori → Kategori", "Hesap → Hesap adı"]
    : ["Date → Transaction Date", "Description → Merchant / Description", "Amount → Transaction Amount", "Type → Debit / Credit", "Category → Category", "Account → Account Name"];

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileError(undefined);
    setParseResult(undefined);
    if (!file.name.toLocaleLowerCase().endsWith(".csv")) {
      setFileError(t("Please choose a CSV file."));
      return;
    }
    try {
      const result = parseTransactionCsv(await file.text());
      if (!result.transactions.length && !result.issues.length) {
        setFileError(t("The file does not contain any transaction rows."));
        return;
      }
      setFileName(file.name);
      setParseResult(result);
      setStep(2);
    } catch {
      setFileError(t("We could not read this CSV file."));
    }
  }

  function resetDialog(open: boolean) {
    if (!open) {
      setStep(1);
      setFileName(undefined);
      setParseResult(undefined);
      setFileError(undefined);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function saveImport() {
    if (!parseResult?.transactions.length) return;
    setIsImporting(true);
    try {
      const response = await fetch("/api/transactions/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows: parseResult.transactions }) });
      const payload = await response.json() as { imported?: number; duplicates?: number; error?: string };
      if (!response.ok) throw new Error(payload.error);
      toast.success(language === "tr" ? `${payload.imported ?? 0} işlem aktarıldı${payload.duplicates ? `, ${payload.duplicates} mükerrer satır atlandı` : ""}.` : `${payload.imported ?? 0} transactions imported${payload.duplicates ? `, ${payload.duplicates} duplicates skipped` : ""}.`);
      await onImported(); setStep(1); setParseResult(undefined); setFileName(undefined);
    } catch (error) { setFileError(error instanceof Error && error.message ? error.message : "Unable to import CSV."); } finally { setIsImporting(false); }
  }

  return <Dialog onOpenChange={resetDialog}>
    <DialogTrigger asChild><Button variant="outline"><Upload />{t("Import CSV")}</Button></DialogTrigger>
    <DialogContent><DialogHeader><DialogTitle>{t("Import transactions")}</DialogTitle><DialogDescription>{t("Nothing is added until you review and approve it.")}</DialogDescription></DialogHeader>
      <div className="steps">{["Upload", "Map columns", "Review"].map((label, index) => <span className={step > index ? "on" : ""} key={label}><b>{step > index + 1 ? <Check /> : index + 1}</b>{t(label)}</span>)}</div>
      {step === 1 && <div className="drop"><Upload /><h3>{t("Drop your CSV here")}</h3><p>{t("date, description and amount required")}</p><Input ref={fileInput} type="file" accept=".csv,text/csv" onChange={handleFileChange} aria-label={t("Choose CSV")} />{fileError && <p role="alert" className="text-destructive">{fileError}</p>}</div>}
      {step === 2 && parseResult && <div className="mapping"><div className="flex items-center gap-2"><FileSpreadsheet /><p>{fileName} · {parseResult.delimiter === ";" ? "semicolon" : "comma"} separated</p></div>{mappingRows.map((row) => <p key={row}>{row}<Check /></p>)}<Button onClick={() => setStep(3)}>{t("Continue to review")}</Button></div>}
      {step === 3 && parseResult && <div className="review"><Check /><h3>{parseResult.transactions.length} {t("rows ready")}</h3><p>{parseResult.issues.length ? `${parseResult.issues.length} ${t("rows need attention before import.")}` : t("All rows passed validation.")}</p>{parseResult.issues.length ? <p className="text-destructive">{t("Fix invalid rows in the CSV and upload it again.")}</p> : <Button disabled={isImporting} onClick={() => void saveImport()}>{isImporting ? (language === "tr" ? "Aktarılıyor…" : "Importing…") : (language === "tr" ? "İşlemleri aktar" : "Import transactions")}</Button>}{fileError && <p className="text-destructive" role="alert">{fileError}</p>}</div>}
    </DialogContent>
  </Dialog>;
}

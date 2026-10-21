"use client";

import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { notifyFinanceDataChanged, useFinanceDataVersion } from "@/lib/finance/data-events";
import { ArrowDownLeft, ArrowUpRight, BriefcaseBusiness, Check, CreditCard, Download, FileSpreadsheet, GraduationCap, MoreHorizontal, MoreVertical, Pencil, ReceiptText, Search, ShoppingCart, SlidersHorizontal, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { AddTransaction } from "@/components/budgetbuddy/shared";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { LanguageContext, useT } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
  const [exportScope, setExportScope] = useState<"personal" | "family">("personal");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

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

  const dataVersion = useFinanceDataVersion();
  useEffect(() => {
    const timer = window.setTimeout(() => void loadTransactions(), 0);
    return () => window.clearTimeout(timer);
  }, [dataVersion, loadTransactions]);

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
  const filterCount = [typeFilter !== "all", accountFilter !== "all", categoryFilter !== "all", Boolean(fromDate), Boolean(toDate)].filter(Boolean).length;

  function clearFilters() {
    setTypeFilter("all");
    setAccountFilter("all");
    setCategoryFilter("all");
    setFromDate("");
    setToDate("");
  }

  return <section className="transactions-page" aria-labelledby="transactions-heading">
    <div className="transactions-heading">
      <div><h2 id="transactions-heading">{t("Transactions")}</h2><p>{language === "tr" ? "Gelir ve giderlerin tek yerde" : "Your income and expenses in one place"}</p></div>
      <Popover open={toolsOpen} onOpenChange={setToolsOpen}>
        <PopoverTrigger asChild><Button variant="outline" size="icon" aria-label={language === "tr" ? "CSV işlemleri" : "CSV tools"}><MoreHorizontal /></Button></PopoverTrigger>
        <PopoverContent align="end" className="transaction-csv-tools" aria-label={language === "tr" ? "CSV işlemleri" : "CSV tools"}>
          <h3>{language === "tr" ? "CSV işlemleri" : "CSV tools"}</h3>
          <label htmlFor="transaction-export-scope">{language === "tr" ? "Dışa aktarma kapsamı" : "Export scope"}</label>
          <Select value={exportScope} onValueChange={(value) => setExportScope(value as "personal" | "family")}><SelectTrigger id="transaction-export-scope"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="personal">{language === "tr" ? "Kişisel" : "Personal"}</SelectItem><SelectItem value="family">{language === "tr" ? "Aile" : "Family"}</SelectItem></SelectGroup></SelectContent></Select>
          <CsvExport scope={exportScope} />
          <Button variant="outline" onClick={() => { setToolsOpen(false); setImportOpen(true); }}><Upload data-icon="inline-start" />{t("Import CSV")}</Button>
        </PopoverContent>
      </Popover>
    </div>
    <CsvImport open={importOpen} onOpenChange={setImportOpen} />
    <div className="transactions-searchbar">
      <div className="transactions-search"><Search aria-hidden="true" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("Search transactions")} aria-label={t("Search transactions")} />{query && <Button variant="ghost" size="icon" onClick={() => setQuery("")} aria-label={language === "tr" ? "Aramayı temizle" : "Clear search"}><X /></Button>}</div>
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetTrigger asChild><Button variant="outline" className="transactions-filter-button"><SlidersHorizontal data-icon="inline-start" />{language === "tr" ? "Filtreler" : "Filters"}{filterCount > 0 && <Badge>{filterCount}</Badge>}</Button></SheetTrigger>
        <SheetContent side="bottom" className="transaction-filters">
          <SheetHeader><SheetTitle>{language === "tr" ? "İşlemleri filtrele" : "Filter transactions"}</SheetTitle><SheetDescription>{language === "tr" ? "Görmek istediğin işlemleri seç." : "Choose the transactions you want to see."}</SheetDescription></SheetHeader>
          <div className="transaction-filter-fields">
            <div><label htmlFor="transaction-type">{t("Transaction type")}</label><Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as "all" | TransactionType)}><SelectTrigger id="transaction-type"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">{t("All types")}</SelectItem><SelectItem value="expense">{t("Expense")}</SelectItem><SelectItem value="income">{t("Income")}</SelectItem></SelectGroup></SelectContent></Select></div>
            <div><label htmlFor="transaction-account">{t("Account")}</label><Select value={accountFilter} onValueChange={setAccountFilter}><SelectTrigger id="transaction-account"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">{t("All accounts")}</SelectItem>{data.accounts.map((account) => <SelectItem value={account.id} key={account.id}>{t(account.name)}</SelectItem>)}</SelectGroup></SelectContent></Select></div>
            <div className="transaction-category-filter"><label htmlFor="transaction-category">{t("Category")}</label><Select value={categoryFilter} onValueChange={setCategoryFilter}><SelectTrigger id="transaction-category"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">{t("All categories")}</SelectItem>{data.categories.map((category) => <SelectItem value={category.id} key={category.id}>{t(category.name)}</SelectItem>)}</SelectGroup></SelectContent></Select></div>
            <div><label htmlFor="transaction-from">{t("From date")}</label><Input id="transaction-from" type="date" value={fromDate} max={toDate || undefined} onChange={(event) => setFromDate(event.target.value)} /></div>
            <div><label htmlFor="transaction-to">{t("To date")}</label><Input id="transaction-to" type="date" value={toDate} min={fromDate || undefined} onChange={(event) => setToDate(event.target.value)} /></div>
          </div>
          <SheetFooter className="transaction-filter-footer"><Button variant="outline" onClick={clearFilters} disabled={!filterCount}>{language === "tr" ? "Filtreleri temizle" : "Clear filters"}</Button><Button onClick={() => setFiltersOpen(false)}>{language === "tr" ? "Sonuçları göster" : "Show results"}{!isLoading && !loadError && ` (${filteredTransactions.length})`}</Button></SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
    {filterCount > 0 && <div className="transaction-filter-summary"><span role="status">{language === "tr" ? `${filterCount} filtre etkin` : `${filterCount} active filters`}</span><Button variant="ghost" size="sm" onClick={clearFilters}>{language === "tr" ? "Temizle" : "Clear"}<X data-icon="inline-end" /></Button></div>}
    {loadError && <div className="panel empty-state"><p role="alert">{loadError}</p><Button onClick={() => void loadTransactions()}>{t("Try again")}</Button></div>}
    {isLoading && <div className="panel empty-state" role="status" aria-live="polite"><p>{t("Loading transactions…")}</p></div>}
    {!isLoading && !loadError && filteredTransactions.length ? <article className="panel tx-table" role="table" aria-label={t("Transactions")}>
      <header role="row"><span role="columnheader">{t("Transaction")}</span><span role="columnheader">{t("Category")}</span><span role="columnheader">{t("Date")}</span><span role="columnheader">{t("Account")}</span><span role="columnheader">{t("Amount")}</span><span role="columnheader">{t("Actions")}</span></header>
      {filteredTransactions.map((transaction) => <div className="tx-row" role="row" key={transaction.id}>
        <b role="cell" className="transaction-title"><TransactionIcon transaction={transaction} /><span>{transaction.title}</span></b><span role="cell" className="transaction-category">{t(transaction.category)}</span><span role="cell" className="transaction-date">{formatTransactionDate(transaction.transactionDate, language)}</span><span role="cell" className="transaction-account">{t(transaction.accountName)}</span>
        <strong role="cell" className={transaction.type === "income" ? "pos" : "neg"}>{transaction.type === "income" ? "+" : "−"}₺{formatNumber(transaction.amount, language)}</strong>
        <div role="cell" className="transaction-row-actions"><TransactionActions transaction={transaction} /></div>
      </div>)}
    </article> : !isLoading && !loadError && <Empty className="panel empty-state"><EmptyHeader><EmptyMedia variant="icon"><Search /></EmptyMedia><EmptyTitle>{hasFilters ? t("No matching transactions") : t("No transactions yet")}</EmptyTitle><EmptyDescription>{hasFilters ? t("Try a different search, or add your first income or expense.") : t("Add your first income or expense to start tracking your money.")}</EmptyDescription></EmptyHeader><EmptyContent><AddTransaction /></EmptyContent></Empty>}
  </section>;
}

function TransactionIcon({ transaction }: { transaction: StoredTransaction }) {
  const category = transaction.category.toLocaleLowerCase("tr-TR");
  const Icon = /transfer/i.test(transaction.title) ? (transaction.type === "income" ? ArrowDownLeft : ArrowUpRight)
    : /eğitim|education/.test(category) ? GraduationCap
    : /maaş|salary/.test(category) ? BriefcaseBusiness
    : /alışveriş|shopping/.test(category) ? ShoppingCart : CreditCard;
  return <i className="transaction-category-icon" aria-hidden="true"><Icon /></i>;
}

function CsvExport({ scope }: { scope: "personal" | "family" }) {
  const { language } = useContext(LanguageContext);
  const [isDownloading, setIsDownloading] = useState(false);
  const download = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(`/api/transactions/export?scope=${scope}`);
      if (!response.ok) { const payload = await response.json().catch(() => ({})) as { error?: string }; throw new Error(payload.error); }
      const blob = await response.blob(); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `budgetbuddy-${scope}-transactions.csv`; link.click(); URL.revokeObjectURL(url);
    } catch (error) { toast.error(error instanceof Error && error.message ? error.message : (language === "tr" ? "CSV dışa aktarılamadı." : "Unable to export CSV.")); } finally { setIsDownloading(false); }
  };
  return <div className="csv-export"><Button variant="outline" disabled={isDownloading} onClick={() => void download()}><Download />{language === "tr" ? "CSV dışa aktar" : "Export CSV"}</Button></div>;
}

function TransactionActions({ transaction }: { transaction: StoredTransaction }) {
  const t = useT();
  const { language } = useContext(LanguageContext);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
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
      notifyFinanceDataChanged();
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : (language === "tr" ? "İşlem silinemedi." : "Unable to delete the transaction."));
    } finally {
      setIsDeleting(false);
    }
  }

  return <div className="tx-actions">
    <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" disabled={isDeleting} aria-label={`${t("Actions")}: ${transaction.title}`}><MoreVertical /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuGroup>
      {transaction.hasReceipt && <ReceiptLink transactionId={transaction.id} language={language} />}
      <DropdownMenuItem onSelect={() => setIsEditOpen(true)}><Pencil />{t("Edit")}</DropdownMenuItem>
      <DropdownMenuItem variant="destructive" onSelect={() => setIsDeleteOpen(true)}><Trash2 />{t("Delete")}</DropdownMenuItem>
    </DropdownMenuGroup></DropdownMenuContent></DropdownMenu>
    <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}><DialogContent><DialogHeader><DialogTitle>{t("Edit transaction")}</DialogTitle><DialogDescription>{t("Update the transaction details.")}</DialogDescription></DialogHeader><TransactionForm key={transaction.id} transaction={transaction} onSuccess={() => setIsEditOpen(false)} /></DialogContent></Dialog>
    <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t("Delete this transaction?")}</AlertDialogTitle><AlertDialogDescription>{t("This action cannot be undone.")}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t("Cancel")}</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={() => void removeTransaction()}>{t("Delete")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
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
  return <DropdownMenuItem disabled={isOpening} onSelect={() => void openReceipt()}><ReceiptText />{language === "tr" ? "Fiş" : "Receipt"}</DropdownMenuItem>;
}

function formatTransactionDate(value: string, language: "en" | "tr") {
  return new Intl.DateTimeFormat(language === "tr" ? "tr-TR" : "en-US", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00Z`));
}

function CsvImport({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
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
      notifyFinanceDataChanged(); setStep(1); setParseResult(undefined); setFileName(undefined);
    } catch (error) { setFileError(error instanceof Error && error.message ? error.message : "Unable to import CSV."); } finally { setIsImporting(false); }
  }

  return <Dialog open={open} onOpenChange={(nextOpen) => { resetDialog(nextOpen); onOpenChange(nextOpen); }}>
    <DialogContent><DialogHeader><DialogTitle>{t("Import transactions")}</DialogTitle><DialogDescription>{t("Nothing is added until you review and approve it.")}</DialogDescription></DialogHeader>
      <div className="steps">{["Upload", "Map columns", "Review"].map((label, index) => <span className={step > index ? "on" : ""} key={label}><b>{step > index + 1 ? <Check /> : index + 1}</b>{t(label)}</span>)}</div>
      {step === 1 && <div className="drop"><Upload /><h3>{t("Drop your CSV here")}</h3><p>{t("date, description and amount required")}</p><Input ref={fileInput} type="file" accept=".csv,text/csv" onChange={handleFileChange} aria-label={t("Choose CSV")} />{fileError && <p role="alert" className="text-destructive">{fileError}</p>}</div>}
      {step === 2 && parseResult && <div className="mapping"><div className="flex items-center gap-2"><FileSpreadsheet /><p>{fileName} · {parseResult.delimiter === ";" ? "semicolon" : "comma"} separated</p></div>{mappingRows.map((row) => <p key={row}>{row}<Check /></p>)}<Button onClick={() => setStep(3)}>{t("Continue to review")}</Button></div>}
      {step === 3 && parseResult && <div className="review"><Check /><h3>{parseResult.transactions.length} {t("rows ready")}</h3><p>{parseResult.issues.length ? `${parseResult.issues.length} ${t("rows need attention before import.")}` : t("All rows passed validation.")}</p>{parseResult.issues.length ? <p className="text-destructive">{t("Fix invalid rows in the CSV and upload it again.")}</p> : <Button disabled={isImporting} onClick={() => void saveImport()}>{isImporting ? (language === "tr" ? "Aktarılıyor…" : "Importing…") : (language === "tr" ? "İşlemleri aktar" : "Import transactions")}</Button>}{fileError && <p className="text-destructive" role="alert">{fileError}</p>}</div>}
    </DialogContent>
  </Dialog>;
}

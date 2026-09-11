import type { TransactionType } from "@/types/finance";

export interface ParsedCsvTransaction {
  rowNumber: number;
  title: string;
  category: string;
  accountName: string;
  transactionDate: string;
  amount: number;
  type: TransactionType;
}

export interface CsvImportIssue {
  rowNumber: number;
  message: string;
}

export interface CsvParseResult {
  transactions: ParsedCsvTransaction[];
  issues: CsvImportIssue[];
  delimiter: "," | ";";
}

type CsvRecord = Record<string, string>;

const headerAliases = {
  date: ["date", "transactiondate", "tarih", "islemtarihi"],
  title: ["description", "merchant", "title", "name", "aciklama", "satici", "islem"],
  amount: ["amount", "transactionamount", "tutar", "islemtutari", "miktar"],
  type: ["type", "transactiontype", "tur", "islemturu"],
  category: ["category", "kategori"],
  accountName: ["account", "accountname", "hesap", "hesapadi"],
} as const;

function normalize(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function getValue(record: CsvRecord, aliases: readonly string[]) {
  const entry = Object.entries(record).find(([key]) => aliases.includes(normalize(key)));
  return entry?.[1]?.trim() ?? "";
}

function splitCsvLine(line: string, delimiter: "," | ";") {
  const cells: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === delimiter && !quoted) {
      cells.push(value.trim());
      value = "";
    } else {
      value += character;
    }
  }

  cells.push(value.trim());
  return cells;
}

function parseAmount(value: string) {
  const cleaned = value.replace(/[^0-9,.-]/g, "").replace(/(?!^)-/g, "");

  if (!cleaned || cleaned === "-") return Number.NaN;

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  const separatorIndex = Math.max(lastComma, lastDot);
  const separatorCount = (cleaned.match(/[,.]/g) ?? []).length;
  const decimalIndex = separatorCount === 1 && cleaned.length - separatorIndex - 1 === 3 ? -1 : separatorIndex;
  const integerPart = (decimalIndex === -1 ? cleaned : cleaned.slice(0, decimalIndex)).replace(/[,.]/g, "");
  const fractionPart = decimalIndex === -1 ? "" : cleaned.slice(decimalIndex + 1).replace(/[,.]/g, "");

  return Number(`${integerPart}${fractionPart ? `.${fractionPart}` : ""}`);
}

function parseDate(value: string) {
  const normalized = value.trim();
  const iso = normalized.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  const local = normalized.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  const parts = iso ? [iso[1], iso[2], iso[3]] : local ? [local[3], local[2], local[1]] : null;

  if (!parts) return null;

  const [year, month, day] = parts;
  const date = new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T00:00:00Z`);

  if (Number.isNaN(date.valueOf()) || date.getUTCFullYear() !== Number(year) || date.getUTCMonth() !== Number(month) - 1 || date.getUTCDate() !== Number(day)) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}

function inferType(value: string, amount: number): TransactionType {
  const type = normalize(value);

  if ([ "income", "credit", "gelir", "alacak", "maas" ].includes(type)) return "income";
  if ([ "expense", "debit", "gider", "borc" ].includes(type)) return "expense";

  return amount < 0 ? "expense" : "income";
}

export function parseTransactionCsv(csv: string): CsvParseResult {
  const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  const delimiter: "," | ";" = lines[0]?.split(";").length > lines[0]?.split(",").length ? ";" : ",";
  const headers = splitCsvLine(lines[0] ?? "", delimiter);
  const transactions: ParsedCsvTransaction[] = [];
  const issues: CsvImportIssue[] = [];

  lines.slice(1).forEach((line, index) => {
    const rowNumber = index + 2;
    const cells = splitCsvLine(line, delimiter);

    if (cells.length !== headers.length) {
      issues.push({ rowNumber, message: "Column count does not match the header." });
      return;
    }

    const record = Object.fromEntries(headers.map((header, cellIndex) => [header, cells[cellIndex] ?? ""]));
    const title = getValue(record, headerAliases.title);
    const rawAmount = getValue(record, headerAliases.amount);
    const amount = parseAmount(rawAmount);
    const transactionDate = parseDate(getValue(record, headerAliases.date));

    if (!title) issues.push({ rowNumber, message: "Description is required." });
    if (!Number.isFinite(amount) || amount === 0) issues.push({ rowNumber, message: "Enter a valid non-zero amount." });
    if (!transactionDate) issues.push({ rowNumber, message: "Enter a valid date (YYYY-MM-DD, DD/MM/YYYY, or DD.MM.YYYY)." });

    if (!title || !Number.isFinite(amount) || amount === 0 || !transactionDate) return;

    transactions.push({
      rowNumber,
      title,
      category: getValue(record, headerAliases.category) || "Uncategorized",
      accountName: getValue(record, headerAliases.accountName) || "Everyday account",
      transactionDate,
      amount: Math.abs(amount),
      type: inferType(getValue(record, headerAliases.type), amount),
    });
  });

  return { transactions, issues, delimiter };
}

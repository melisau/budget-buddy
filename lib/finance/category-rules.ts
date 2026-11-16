// Pure matching rules for automatic categorization. No imports, so it can be
// unit-tested directly and used on both the server and in the browser.

export type TransactionKind = "income" | "expense";
export type CategoryRule = { id: string; keyword: string; type: TransactionKind; categoryId: string };

export const MIN_KEYWORD_LENGTH = 2;
export const MAX_KEYWORD_LENGTH = 80;

/**
 * Lower-case (Turkish rules, so "I" and "İ" behave), without accents or
 * punctuation, single spaces. "MİGROS  A.Ş." and "migros a s" compare equal.
 */
export function normalizeText(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** The keyword as it will be stored, or null when it is too short or too long to be useful. */
export function cleanKeyword(value: string): string | null {
  const keyword = value.trim().replace(/\s+/g, " ");
  const length = normalizeText(keyword).length;
  return length >= MIN_KEYWORD_LENGTH && keyword.length <= MAX_KEYWORD_LENGTH ? keyword : null;
}

function containsWords(text: string, keyword: string): boolean {
  // Match whole words, so the keyword "bim" does not match "kombim".
  return ` ${text} `.includes(` ${keyword} `);
}

/**
 * The rule that applies to a description, or null. Only rules of the same
 * type count. The most specific rule (the longest keyword) wins; on a tie the
 * one created first in the list wins.
 */
export function matchCategoryRule(title: string, type: TransactionKind, rules: readonly CategoryRule[]): CategoryRule | null {
  const text = normalizeText(title);
  if (!text) return null;
  let best: { rule: CategoryRule; length: number } | null = null;
  for (const rule of rules) {
    if (rule.type !== type) continue;
    const keyword = normalizeText(rule.keyword);
    if (keyword.length < MIN_KEYWORD_LENGTH || !containsWords(text, keyword)) continue;
    if (!best || keyword.length > best.length) best = { rule, length: keyword.length };
  }
  return best?.rule ?? null;
}

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { cleanKeyword, matchCategoryRule, normalizeText, type CategoryRule } from "../lib/finance/category-rules.ts";

const rule = (keyword: string, categoryId: string, type: "income" | "expense" = "expense"): CategoryRule => ({ id: `r-${keyword}`, keyword, type, categoryId });

describe("normalizing text", () => {
  test("ignores case, Turkish letters, punctuation and extra spaces", () => {
    assert.equal(normalizeText("MİGROS  A.Ş."), "migros a s");
    assert.equal(normalizeText("Şok Market-İstanbul"), "sok market istanbul");
    assert.equal(normalizeText("ISPARTA"), "isparta");
    assert.equal(normalizeText("  "), "");
  });
});

describe("keywords", () => {
  test("are trimmed and tidied, and too short or too long ones are refused", () => {
    assert.equal(cleanKeyword("  Migros   Jet "), "Migros Jet");
    assert.equal(cleanKeyword("a"), null);
    assert.equal(cleanKeyword("..."), null);
    assert.equal(cleanKeyword("x".repeat(81)), null);
  });
});

describe("matching a description", () => {
  const rules = [rule("migros", "market"), rule("migros jet", "online"), rule("netflix", "subs"), rule("maaş", "salary", "income")];

  test("finds a rule inside a bank-statement style description", () => {
    assert.equal(matchCategoryRule("POS 4321 MİGROS ANKARA TR", "expense", rules)?.categoryId, "market");
    assert.equal(matchCategoryRule("NETFLIX.COM", "expense", rules)?.categoryId, "subs");
  });

  test("the most specific keyword wins", () => {
    assert.equal(matchCategoryRule("Migros Jet siparişi", "expense", rules)?.categoryId, "online");
  });

  test("matches whole words only", () => {
    assert.equal(matchCategoryRule("kombinasyon", "expense", [rule("bim", "market")]), null);
    assert.equal(matchCategoryRule("BIM A101", "expense", [rule("bim", "market")])?.categoryId, "market");
  });

  test("only rules of the same type apply", () => {
    assert.equal(matchCategoryRule("Maaş Kasım", "expense", rules), null);
    assert.equal(matchCategoryRule("Maaş Kasım", "income", rules)?.categoryId, "salary");
  });

  test("an empty description or no rules gives nothing", () => {
    assert.equal(matchCategoryRule("", "expense", rules), null);
    assert.equal(matchCategoryRule("Migros", "expense", []), null);
  });
});

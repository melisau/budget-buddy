// Turkish names of the default categories. Categories are stored with their
// English names, so anything that shows one outside the main UI (notifications,
// e-mail) translates it here. The main UI has the same names in its
// translation table; a custom category the user named is shown as written.
export const defaultCategoryNamesTr: Record<string, string> = {
  "Salary": "Maaş", "Freelance income": "Serbest çalışma geliri", "Investment income": "Yatırım geliri",
  "Gift income": "Hediye geliri", "Other income": "Diğer gelir",
  "Housing": "Konut", "Groceries": "Market", "Dining": "Dışarıda yemek", "Transport": "Ulaşım", "Utilities": "Faturalar",
  "Health": "Sağlık", "Education": "Eğitim", "Entertainment": "Eğlence", "Shopping": "Alışveriş", "Subscriptions": "Abonelikler",
  "Personal care": "Kişisel bakım", "Travel": "Seyahat", "Insurance": "Sigorta", "Debt payments": "Borç ödemeleri",
  "Gifts": "Hediyeler", "Other expenses": "Diğer giderler",
};

export function categoryDisplayName(name: string, language: "tr" | "en"): string {
  return language === "tr" ? defaultCategoryNamesTr[name] ?? name : name;
}

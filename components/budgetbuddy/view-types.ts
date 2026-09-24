export type View =
  | "landing"
  | "signin"
  | "signup"
  | "dashboard"
  | "family"
  | "wishlists"
  | "transactions"
  | "budgets"
  | "accounts"
  | "goals"
  | "analytics"
  | "assistant"
  | "settings";

export type Navigate = (view: View) => void;

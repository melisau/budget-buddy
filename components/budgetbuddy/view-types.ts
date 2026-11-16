export type View =
  | "landing"
  | "signin"
  | "signup"
  | "dashboard"
  | "family"
  | "wishlists"
  | "recurring"
  | "transactions"
  | "budgets"
  | "accounts"
  | "goals"
  | "analytics"
  | "assistant"
  | "settings";

export type Navigate = (view: View) => void;

export type View =
  | "landing"
  | "signin"
  | "signup"
  | "dashboard"
  | "family"
  | "transactions"
  | "budgets"
  | "accounts"
  | "goals"
  | "analytics"
  | "assistant"
  | "settings";

export type Navigate = (view: View) => void;

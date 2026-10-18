import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy and KVKK Notice",
  description: "How BudgetBuddy processes personal data under the Turkish KVKK: data collected, legal grounds, service providers, retention and your rights.",
  alternates: { canonical: "/privacy" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

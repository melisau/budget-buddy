import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./mobile.css";
import {ClerkClientProvider} from "@/components/providers/clerk-client-provider";
import {LanguageProvider} from "@/components/providers/language-provider";
import {ErrorReportingProvider} from "@/components/providers/error-reporting-provider";
import {Toaster} from "@/components/ui/sonner";
import {SkipLink} from "@/components/layout/skip-link";

export const metadata: Metadata = {
  title: "BudgetBuddy — Personal finance, made clear",
  description: "Track spending, plan budgets, grow savings goals, and understand your finances with simple AI-powered insights.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className="antialiased">
        <ClerkClientProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
          <LanguageProvider><SkipLink/><ErrorReportingProvider>{children}</ErrorReportingProvider><Toaster richColors/></LanguageProvider>
        </ClerkClientProvider>
      </body>
    </html>
  );
}

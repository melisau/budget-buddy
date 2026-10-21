import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./mobile.css";
import {AuthProvider} from "@/components/providers/auth-provider";
import {LanguageProvider} from "@/components/providers/language-provider";
import {AuthLanguageSync} from "@/components/providers/auth-language-sync";
import {ErrorReportingProvider} from "@/components/providers/error-reporting-provider";
import {Toaster} from "@/components/ui/sonner";
import {SkipLink} from "@/components/layout/skip-link";
import { BRAND_COLOR, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: ["personal finance", "budget app", "expense tracker", "savings goals", "family budget", "bütçe uygulaması", "harcama takibi", "gelir gider takibi", "aile bütçesi", "birikim hedefi"],
  authors: [{ name: "Melisa Uyar" }],
  alternates: { canonical: "/" },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    locale: "en_US",
    alternateLocale: ["tr_TR"],
  },
  twitter: { card: "summary_large_image", title: SITE_TITLE, description: SITE_DESCRIPTION },
  formatDetection: { telephone: false },
  // Optional: Search Console "HTML tag" verification. DNS verification needs no code.
  ...(process.env.GOOGLE_SITE_VERIFICATION ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } } : {}),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: BRAND_COLOR,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>
          <LanguageProvider><AuthLanguageSync/><SkipLink/><ErrorReportingProvider>{children}</ErrorReportingProvider><Toaster richColors/></LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

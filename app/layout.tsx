import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./mobile.css";
import {AuthProvider} from "@/components/providers/auth-provider";
import {LanguageProvider} from "@/components/providers/language-provider";
import {AuthLanguageSync} from "@/components/providers/auth-language-sync";
import {ServiceWorkerRegistration} from "@/components/providers/service-worker-registration";
import {ErrorReportingProvider} from "@/components/providers/error-reporting-provider";
import {Toaster} from "@/components/ui/sonner";
import {SkipLink} from "@/components/layout/skip-link";
import { BRAND_COLOR, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from "@/lib/site";
import { headers } from "next/headers";
import { PAGE_LANGUAGE_HEADER, pageLanguage } from "@/lib/seo/i18n";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: ["personal finance", "budget app", "expense tracker", "savings goals", "family budget", "bütçe uygulaması", "harcama takibi", "gelir gider takibi", "aile bütçesi", "birikim hedefi"],
  authors: [{ name: "Melisa Uyar" }],
  alternates: { canonical: "/" },
  icons: { icon: [{ url: "/brand/icon-32.png", sizes: "32x32", type: "image/png" }, { url: "/brand/icon-48.png", sizes: "48x48", type: "image/png" }], shortcut: "/brand/icon-32.png" },
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
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: "default" },
  // Optional: Search Console "HTML tag" verification. DNS verification needs no code.
  ...(process.env.GOOGLE_SITE_VERIFICATION ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } } : {}),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: BRAND_COLOR,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const lang = pageLanguage((await headers()).get(PAGE_LANGUAGE_HEADER));
  return (
    <html lang={lang}>
      <body className="antialiased">
        <AuthProvider>
          <LanguageProvider><AuthLanguageSync/><ServiceWorkerRegistration/><SkipLink/><ErrorReportingProvider>{children}</ErrorReportingProvider><Toaster richColors/></LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

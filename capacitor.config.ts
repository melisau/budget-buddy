import type { CapacitorConfig } from "@capacitor/cli";

// The native apps load the deployed site, because the Next.js app relies on
// server routes and Supabase Auth cookies and cannot be exported statically.
// mobile/www only holds an offline fallback page bundled into the app.
const config: CapacitorConfig = {
  appId: "com.melisauyar.budgetbuddy",
  appName: "Budget Buddy",
  webDir: "mobile/www",
  server: {
    url: process.env.CAPACITOR_SERVER_URL ?? "https://budgetbuddy.melisauyar.com",
    errorPath: "index.html",
    allowNavigation: ["budgetbuddy.melisauyar.com"],
  },
  android: { path: "mobile/android" },
  ios: { path: "mobile/ios" },
  plugins: {
    SystemBars: { style: "LIGHT", initialViewportFitValueHint: "cover" },
    SocialLogin: { providers: { google: true, facebook: false, apple: false, twitter: false } },
  },
};

export default config;

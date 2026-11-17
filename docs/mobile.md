# Mobile apps (Capacitor)

The iOS and Android apps are Capacitor shells in `mobile/ios` and `mobile/android`.
They load the deployed site (`server.url` in `capacitor.config.ts`) because the
Next.js app needs server routes and Supabase Auth cookies, so it cannot be
exported as static files. `mobile/www/index.html` is a bundled offline page.

The older Trusted Web Activity package in `android/` is unchanged. Both use the
app ID `com.melisauyar.budgetbuddy`; publish only one of them to Google Play.

## Commands

- `pnpm mobile:sync` — copy config and plugins into the native projects (run after changing `capacitor.config.ts` or adding a plugin).
- `pnpm mobile:android` — open the Android project in Android Studio.
- `pnpm mobile:ios` — open the iOS project in Xcode (macOS only).

To point a debug build at a local server, set `CAPACITOR_SERVER_URL` (for example
`http://10.0.2.2:5173` for the Android emulator) before `pnpm mobile:sync`.
Never point it at production Supabase from a local stack.

## Store requirements

- iOS: Apple may reject apps that only wrap a website (guideline 4.2). Add native
  features (camera receipt capture, push notifications, haptics) before submitting.
- Sign-in links in Supabase emails open the browser, not the app, until deep links
  (Android App Links / iOS Universal Links) are configured.

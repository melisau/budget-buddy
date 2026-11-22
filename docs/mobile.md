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

## Google sign-in in the apps

Google blocks sign-in inside embedded WebViews, so the apps use the native account
picker (`@capgo/capacitor-social-login`, `components/auth/native-google-button.tsx`).
It returns a Google ID token that is exchanged with `supabase.auth.signInWithIdToken`,
the same as the website's Google Identity Services flow.

Setup in Google Cloud Console → Credentials (same project as `NEXT_PUBLIC_GOOGLE_CLIENT_ID`):

1. Create an **Android** OAuth client with package `com.melisauyar.budgetbuddy` and the
   SHA-1 of each signing key (debug key: `cd mobile/android && ./gradlew signingReport`;
   release: the upload key, plus the Play App Signing key from Play Console).
2. For iOS, create an **iOS** OAuth client (bundle ID `com.melisauyar.budgetbuddy`), set
   `NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID`, add it to Supabase → Auth → Google → Authorized
   Client IDs, add its reversed client ID as a URL scheme in `Info.plist`, and forward
   URL opens in `SceneDelegate.swift` (see the plugin's `docs/setup_google.md`).

The web client ID stays the token audience on Android, so no Supabase change is needed there.
Because the apps load the deployed site, these changes take effect after a deploy.

The Flutter app (`apps/mobile`) uses `google_sign_in` with the same Android OAuth clients.
Pass the public web client ID at build time with
`--dart-define=GOOGLE_WEB_CLIENT_ID=<web client id>`; without it the Google button is hidden.

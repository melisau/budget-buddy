import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'core/api.dart';
import 'core/config.dart';
import 'core/dashboard_cache.dart';
import 'core/error_reporter.dart';
import 'core/i18n.dart';
import 'core/onboarding.dart';
import 'core/session_storage.dart';
import 'core/theme.dart';
import 'core/theme_mode.dart';
import 'features/app_navigation.dart';
import 'features/assistant.dart';
import 'features/allowance.dart';
import 'features/category_rules.dart';
import 'features/finance_screens.dart';
import 'features/more.dart';
import 'features/notifications.dart';
import 'features/onboarding.dart';
import 'features/overview.dart';
import 'features/settings.dart';
import 'features/sign_in.dart';
import 'features/social_screens.dart';
import 'features/transactions.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  ErrorReporter.install();
  // Started now, awaited with Supabase below, so the two load in parallel.
  final dates = I18n.load();
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
      systemNavigationBarColor: Colors.white,
      systemNavigationBarIconBrightness: Brightness.dark,
    ),
  );
  if (!AppConfig.isValid) {
    await dates;
    runApp(
      MaterialApp(
        home: Scaffold(
          body: Center(child: Text(t('Uygulama yapılandırması eksik.'))),
        ),
      ),
    );
    return;
  }
  await Future.wait([
    dates,
    Onboarding.load(),
    Supabase.initialize(
      url: AppConfig.supabaseUrl,
      publishableKey: AppConfig.supabaseKey,
      authOptions: const FlutterAuthClientOptions(
        localStorage: SecureSessionStorage(),
      ),
    ),
  ]);
  if (!Onboarding.done &&
      Supabase.instance.client.auth.currentSession != null) {
    await Onboarding.skipForSignedInUser();
  }
  runApp(ProviderScope(child: BudgetBuddyApp(router: _buildRouter())));
}

class _AuthRefresh extends ChangeNotifier {
  _AuthRefresh() {
    _subscription = Supabase.instance.client.auth.onAuthStateChange.listen((
      state,
    ) {
      // No cached financial data survives a sign-out on a shared phone.
      if (state.event == AuthChangeEvent.signedOut) DashboardCache.clear();
      if (state.event == AuthChangeEvent.signedIn) {
        unawaited(_applyOnboardingChoice());
      }
      notifyListeners();
    });
  }

  late final StreamSubscription<AuthState> _subscription;

  @override
  void dispose() {
    _subscription.cancel();
    super.dispose();
  }
}

/// Sends the language and currency picked on the welcome screens to the account, once.
Future<void> _applyOnboardingChoice() async {
  final choice = await Onboarding.takePending();
  if (choice == null) return;
  try {
    await Api().patch('account', choice);
  } catch (_) {
    // Not worth an error: both can be changed later in Ayarlar.
  }
}

GoRouter _buildRouter() => GoRouter(
  initialLocation: '/overview',
  refreshListenable: _AuthRefresh(),
  redirect: (_, state) {
    final signedIn = Supabase.instance.client.auth.currentSession != null;
    final atSignIn = state.matchedLocation == '/sign-in';
    final atWelcome = state.matchedLocation == '/welcome';
    if (!signedIn && !Onboarding.done) return atWelcome ? null : '/welcome';
    if (!signedIn) return atSignIn ? null : '/sign-in';
    if (atWelcome) return '/overview';
    return atSignIn ? '/overview' : null;
  },
  routes: [
    GoRoute(path: '/welcome', builder: (_, _) => OnboardingScreen()),
    GoRoute(path: '/sign-in', builder: (_, _) => SignInScreen()),
    StatefulShellRoute.indexedStack(
      builder: (_, _, shell) => _Shell(shell),
      branches: [
        StatefulShellBranch(
          routes: [
            GoRoute(path: '/overview', builder: (_, _) => OverviewScreen()),
          ],
        ),
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/transactions',
              builder: (_, _) => TransactionsScreen(),
            ),
          ],
        ),
        StatefulShellBranch(
          routes: [
            GoRoute(path: '/assistant', builder: (_, _) => AssistantScreen()),
          ],
        ),
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/more',
              builder: (_, _) => MoreScreen(),
              routes: [
                GoRoute(path: 'family', builder: (_, _) => FamilyScreen()),
                GoRoute(
                  path: 'wishlists',
                  builder: (_, _) => WishlistsScreen(),
                ),
                GoRoute(
                  path: 'recurring',
                  builder: (_, _) => RecurringScreen(),
                ),
                GoRoute(path: 'budgets', builder: (_, _) => BudgetsScreen()),
                GoRoute(path: 'accounts', builder: (_, _) => AccountsScreen()),
                GoRoute(path: 'goals', builder: (_, _) => const GoalsScreen()),
                GoRoute(
                  path: 'analytics',
                  builder: (_, _) => const AnalyticsScreen(),
                ),
                GoRoute(
                  path: 'settings',
                  builder: (_, _) => const SettingsScreen(),
                ),
                GoRoute(
                  path: 'allowance',
                  builder: (_, _) => const AllowanceScreen(),
                ),
                GoRoute(
                  path: 'category-rules',
                  builder: (_, _) => const CategoryRulesScreen(),
                ),
                GoRoute(
                  path: 'notifications',
                  builder: (_, _) => const NotificationsScreen(),
                ),
              ],
            ),
          ],
        ),
      ],
    ),
  ],
);

class BudgetBuddyApp extends ConsumerWidget {
  const BudgetBuddyApp({super.key, required this.router});

  final GoRouter router;

  @override
  Widget build(BuildContext context, WidgetRef ref) =>
      // Every text is looked up when it is built, so a new language rebuilds the tree.
      ValueListenableBuilder<String>(
        valueListenable: I18n.language,
        builder: (context, language, _) => _app(ref, language),
      );

  Widget _app(WidgetRef ref, String language) => MaterialApp.router(
    key: ValueKey(language),
    title: 'BudgetBuddy',
    debugShowCheckedModeBanner: false,
    theme: buildTheme(),
    darkTheme: buildTheme(Brightness.dark),
    themeMode: ref.watch(themeModeProvider),
    routerConfig: router,
    locale: Locale(language),
    supportedLocales: const [Locale('tr'), Locale('en'), Locale('de')],
    localizationsDelegates: const [
      GlobalMaterialLocalizations.delegate,
      GlobalWidgetsLocalizations.delegate,
      GlobalCupertinoLocalizations.delegate,
    ],
  );
}

class _Shell extends StatelessWidget {
  const _Shell(this.shell);

  final StatefulNavigationShell shell;

  @override
  Widget build(BuildContext context) => Scaffold(
    body: shell,
    bottomNavigationBar: AppNavigationBar(
      currentIndex: shell.currentIndex,
      onTabSelected: (i) {
        HapticFeedback.selectionClick();
        shell.goBranch(i, initialLocation: i == shell.currentIndex);
      },
      onAdd: () {
        HapticFeedback.selectionClick();
        showAddTransaction(context);
      },
    ),
  );
}

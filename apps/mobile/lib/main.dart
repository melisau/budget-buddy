import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'core/config.dart';
import 'core/dashboard_cache.dart';
import 'core/error_reporter.dart';
import 'core/session_storage.dart';
import 'core/theme.dart';
import 'core/theme_mode.dart';
import 'features/app_navigation.dart';
import 'features/assistant.dart';
import 'features/finance_screens.dart';
import 'features/more.dart';
import 'features/notifications.dart';
import 'features/overview.dart';
import 'features/settings.dart';
import 'features/sign_in.dart';
import 'features/social_screens.dart';
import 'features/transactions.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  ErrorReporter.install();
  // Started now, awaited with Supabase below, so the two load in parallel.
  final dates = initializeDateFormatting('tr_TR');
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
      const MaterialApp(
        home: Scaffold(
          body: Center(child: Text('Uygulama yapılandırması eksik.')),
        ),
      ),
    );
    return;
  }
  await Future.wait([
    dates,
    Supabase.initialize(
      url: AppConfig.supabaseUrl,
      publishableKey: AppConfig.supabaseKey,
      authOptions: const FlutterAuthClientOptions(
        localStorage: SecureSessionStorage(),
      ),
    ),
  ]);
  runApp(ProviderScope(child: BudgetBuddyApp(router: _buildRouter())));
}

class _AuthRefresh extends ChangeNotifier {
  _AuthRefresh() {
    _subscription = Supabase.instance.client.auth.onAuthStateChange.listen((
      state,
    ) {
      // No cached financial data survives a sign-out on a shared phone.
      if (state.event == AuthChangeEvent.signedOut) DashboardCache.clear();
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

GoRouter _buildRouter() => GoRouter(
  initialLocation: '/overview',
  refreshListenable: _AuthRefresh(),
  redirect: (_, state) {
    final signedIn = Supabase.instance.client.auth.currentSession != null;
    final atSignIn = state.matchedLocation == '/sign-in';
    if (!signedIn) return atSignIn ? null : '/sign-in';
    return atSignIn ? '/overview' : null;
  },
  routes: [
    GoRoute(path: '/sign-in', builder: (_, _) => const SignInScreen()),
    StatefulShellRoute.indexedStack(
      builder: (_, _, shell) => _Shell(shell),
      branches: [
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/overview',
              builder: (_, _) => const OverviewScreen(),
            ),
          ],
        ),
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/transactions',
              builder: (_, _) => const TransactionsScreen(),
            ),
          ],
        ),
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/assistant',
              builder: (_, _) => const AssistantScreen(),
            ),
          ],
        ),
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/more',
              builder: (_, _) => const MoreScreen(),
              routes: [
                GoRoute(
                  path: 'family',
                  builder: (_, _) => const FamilyScreen(),
                ),
                GoRoute(
                  path: 'wishlists',
                  builder: (_, _) => const WishlistsScreen(),
                ),
                GoRoute(
                  path: 'recurring',
                  builder: (_, _) => const RecurringScreen(),
                ),
                GoRoute(
                  path: 'budgets',
                  builder: (_, _) => const BudgetsScreen(),
                ),
                GoRoute(
                  path: 'accounts',
                  builder: (_, _) => const AccountsScreen(),
                ),
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
  Widget build(BuildContext context, WidgetRef ref) => MaterialApp.router(
    title: 'BudgetBuddy',
    debugShowCheckedModeBanner: false,
    theme: buildTheme(),
    darkTheme: buildTheme(Brightness.dark),
    themeMode: ref.watch(themeModeProvider),
    routerConfig: router,
    locale: const Locale('tr', 'TR'),
    supportedLocales: const [Locale('tr', 'TR')],
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

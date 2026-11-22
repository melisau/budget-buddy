import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/api.dart';

final apiProvider = Provider((_) => Api());

String currentMonth() => DateTime.now().toIso8601String().substring(0, 7);

final dashboardProvider = FutureProvider.autoDispose(
  (ref) => ref.watch(apiProvider).get('dashboard?month=${currentMonth()}'),
);

final transactionsProvider = FutureProvider.autoDispose(
  (ref) => ref.watch(apiProvider).get('transactions'),
);

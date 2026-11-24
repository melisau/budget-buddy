import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/api.dart';

final apiProvider = Provider((_) => Api());

String currentMonth() => DateTime.now().toIso8601String().substring(0, 7);

final dashboardProvider = FutureProvider.autoDispose(
  (ref) => ref.watch(apiProvider).get('dashboard?month=${currentMonth()}'),
);

const transactionPageSize = 50;

/// The first page of transactions, plus the accounts and categories for forms.
final transactionsProvider = FutureProvider.autoDispose(
  (ref) =>
      ref.watch(apiProvider).get('transactions?limit=$transactionPageSize'),
);

String transactionPagePath({String? cursor, String query = ''}) {
  final params = {
    'limit': '$transactionPageSize',
    'cursor': ?cursor,
    if (query.isNotEmpty) 'q': query,
  };
  return 'transactions?${Uri(queryParameters: params).query}';
}

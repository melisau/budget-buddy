import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../core/api.dart';
import '../core/dashboard_cache.dart';

final apiProvider = Provider((_) => Api());

String currentMonth() => DateTime.now().toIso8601String().substring(0, 7);

String? _userId() => Supabase.instance.client.auth.currentUser?.id;

final dashboardProvider = FutureProvider.autoDispose((ref) async {
  final month = currentMonth();
  final data = await ref.watch(apiProvider).get('dashboard?month=$month');
  final userId = _userId();
  if (userId != null) unawaited(DashboardCache.write(userId, month, data));
  return data;
});

/// The dashboard from the previous visit, shown while the fresh one loads.
final cachedDashboardProvider = FutureProvider.autoDispose((ref) async {
  final userId = _userId();
  return userId == null ? null : DashboardCache.read(userId, currentMonth());
});

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

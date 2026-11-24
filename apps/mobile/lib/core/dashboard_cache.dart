import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// The last dashboard response, kept so the app can show it at once while the
/// fresh one loads. Stored encrypted, only for the signed-in user and the
/// current month, and removed on sign-out.
class DashboardCache {
  static const _storage = FlutterSecureStorage();
  static const _key = 'dashboard_cache_v1';

  static Future<Map<String, dynamic>?> read(String userId, String month) async {
    try {
      final raw = await _storage.read(key: _key);
      if (raw == null) return null;
      final stored = jsonDecode(raw) as Map<String, dynamic>;
      if (stored['userId'] != userId || stored['month'] != month) return null;
      return stored['data'] as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  static Future<void> write(
    String userId,
    String month,
    Map<String, dynamic> data,
  ) async {
    try {
      await _storage.write(
        key: _key,
        value: jsonEncode({'userId': userId, 'month': month, 'data': data}),
      );
    } catch (_) {
      // A cache that cannot be written only means a slower next start.
    }
  }

  static Future<void> clear() async {
    try {
      await _storage.delete(key: _key);
    } catch (_) {}
  }
}

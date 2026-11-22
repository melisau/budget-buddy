import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'api.dart';
import 'config.dart';

typedef ErrorTransport = Future<void> Function(Map<String, String> report);

/// Sends unexpected app errors to `/api/errors`. Reporting never throws.
class ErrorReporter {
  ErrorReporter(this._transport, {this.maxReports = 10});

  static const _messageLimit = 500;
  static const _stackLimit = 4000;
  static const _buildName = String.fromEnvironment('FLUTTER_BUILD_NAME');
  static const _buildNumber = String.fromEnvironment('FLUTTER_BUILD_NUMBER');

  final ErrorTransport _transport;
  final int maxReports;
  final Set<String> _seen = {};

  /// Connects Flutter and platform error hooks. Debug builds only log locally.
  static void install() {
    if (kDebugMode) return;
    final reporter = ErrorReporter(_sendToApi);
    final previousFlutterHandler = FlutterError.onError;
    FlutterError.onError = (details) {
      previousFlutterHandler?.call(details);
      unawaited(reporter.report(details.exception, details.stack));
    };
    final previousPlatformHandler = PlatformDispatcher.instance.onError;
    PlatformDispatcher.instance.onError = (error, stack) {
      unawaited(reporter.report(error, stack));
      return previousPlatformHandler?.call(error, stack) ?? false;
    };
  }

  Future<void> report(Object error, StackTrace? stack) async {
    try {
      if (isExpected(error) || _seen.length >= maxReports) return;
      final message = describe(error);
      final stackText = redact(stack?.toString() ?? '');
      final firstFrame = stackText.split('\n').first;
      if (!_seen.add('$message|$firstFrame')) return;
      await _transport({
        'source': 'client',
        'message': _limit(message, _messageLimit),
        if (stackText.isNotEmpty) 'stack': _limit(stackText, _stackLimit),
        'path': 'flutter/$_buildName+$_buildNumber',
      });
    } catch (_) {
      // A failed report must never affect the app.
    }
  }

  /// Network and API failures are already shown to the user.
  static bool isExpected(Object error) =>
      error is ApiException ||
      error is AuthException ||
      error is SocketException ||
      error is HttpException ||
      error is TlsException ||
      error is TimeoutException;

  static String describe(Object error) {
    // FormatException.toString() can include the text that failed to parse.
    final detail = error is FormatException ? error.message : error.toString();
    return '${error.runtimeType}: ${redact(detail)}';
  }

  /// Removes personal values that can appear inside exception text.
  static String redact(String text) => text
      .replaceAll(
        RegExp(r'bearer\s+[\w.~+/=-]+', caseSensitive: false),
        '[token]',
      )
      .replaceAll(RegExp(r'\beyJ[\w-]*\.[\w-]+\.[\w-]*'), '[token]')
      .replaceAll(RegExp(r'[\w.+-]+@[\w-]+(\.[\w-]+)+'), '[email]')
      .replaceAllMapped(
        RegExp(r'(https?://[^\s?#]+)[?#]\S*'),
        (match) => match.group(1)!,
      )
      .replaceAll(RegExp(r'(?<![\w:.])\d[\d.,]{3,}\d(?![\w:])'), '[number]');

  static String _limit(String value, int limit) =>
      value.length <= limit ? value : value.substring(0, limit);

  static Future<void> _sendToApi(Map<String, String> report) async {
    final client = HttpClient()
      ..connectionTimeout = const Duration(seconds: 10);
    try {
      final request = await client.postUrl(
        Uri.parse('${AppConfig.apiUrl}/api/errors'),
      );
      request.headers.contentType = ContentType.json;
      final token = _accessToken();
      if (token != null) {
        request.headers.set(HttpHeaders.authorizationHeader, 'Bearer $token');
      }
      request.add(utf8.encode(jsonEncode(report)));
      final response = await request.close().timeout(
        const Duration(seconds: 10),
      );
      await response.drain<void>();
    } finally {
      client.close(force: true);
    }
  }

  static String? _accessToken() {
    try {
      final session = Supabase.instance.client.auth.currentSession;
      return session == null || session.isExpired ? null : session.accessToken;
    } catch (_) {
      return null; // Supabase is not initialized yet.
    }
  }
}

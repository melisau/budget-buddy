import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Whether the welcome screens were shown, and the language and currency
/// chosen there before signing in. The choice is sent to the account once,
/// right after the first sign-in.
class Onboarding {
  Onboarding._();

  static const _storage = FlutterSecureStorage();
  static const _doneKey = 'onboarding_done';
  static const _pendingKey = 'onboarding_pending';

  static const languages = {'tr': 'Türkçe', 'en': 'English', 'de': 'Deutsch'};
  static const currencies = ['TRY', 'EUR', 'USD', 'GBP'];

  /// Read once at startup so the router can decide synchronously.
  static bool done = false;

  static Future<void> load() async {
    try {
      done = await _storage.read(key: _doneKey) == 'true';
    } catch (_) {
      done = false;
    }
  }

  /// Marks the welcome screens as seen and keeps the choice for after sign-in.
  static Future<void> finish({
    required String language,
    required String currency,
  }) async {
    done = true;
    try {
      await _storage.write(key: _doneKey, value: 'true');
      await _storage.write(key: _pendingKey, value: encode(language, currency));
    } catch (_) {
      // Without storage the screens may show again; nothing else breaks.
    }
  }

  /// Someone already signed in never needs the welcome screens.
  static Future<void> skipForSignedInUser() async {
    done = true;
    try {
      await _storage.write(key: _doneKey, value: 'true');
    } catch (_) {}
  }

  /// The choice still waiting to be saved to the account, then forgotten.
  static Future<Map<String, String>?> takePending() async {
    try {
      final value = await _storage.read(key: _pendingKey);
      await _storage.delete(key: _pendingKey);
      return value == null ? null : decode(value);
    } catch (_) {
      return null;
    }
  }

  static String encode(String language, String currency) =>
      '$language:$currency';

  /// Only supported values survive, so a bad value is never sent.
  static Map<String, String>? decode(String value) {
    final parts = value.split(':');
    if (parts.length != 2) return null;
    final result = <String, String>{
      if (languages.containsKey(parts[0])) 'language': parts[0],
      if (currencies.contains(parts[1])) 'currency': parts[1],
    };
    return result.isEmpty ? null : result;
  }
}

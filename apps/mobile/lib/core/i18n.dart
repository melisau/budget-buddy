import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'strings.dart';

/// The app's language: 'tr', 'en' or 'de'. Texts are written in Turkish in the
/// code and looked up in [strings] for English and German.
class I18n {
  I18n._();

  static const supported = ['tr', 'en', 'de'];
  static const names = {'tr': 'Türkçe', 'en': 'English', 'de': 'Deutsch'};
  static const _storage = FlutterSecureStorage();
  static const _key = 'app_language';

  /// The app rebuilds when this changes.
  static final ValueNotifier<String> language = ValueNotifier('tr');

  /// Reads the saved choice; on first start, follows the phone's language
  /// (Turkish and German as they are, anything else English).
  static Future<void> load() async {
    String? saved;
    try {
      saved = await _storage.read(key: _key);
    } catch (_) {}
    language.value = supported.contains(saved)
        ? saved!
        : fromDevice(PlatformDispatcher.instance.locale.languageCode);
    await Future.wait(
      ['tr_TR', 'en_US', 'de_DE'].map(initializeDateFormatting),
    );
  }

  static String fromDevice(String code) => code == 'tr'
      ? 'tr'
      : code == 'de'
      ? 'de'
      : 'en';

  static Future<void> set(String value) async {
    if (!supported.contains(value)) return;
    language.value = value;
    try {
      await _storage.write(key: _key, value: value);
    } catch (_) {}
  }

  /// Intl locale for dates and numbers.
  static String get locale => switch (language.value) {
    'en' => 'en_US',
    'de' => 'de_DE',
    _ => 'tr_TR',
  };
}

/// A Turkish UI text in the current language.
String t(String turkish) {
  final lang = I18n.language.value;
  if (lang == 'tr') return turkish;
  final row = strings[turkish];
  if (row == null) return turkish;
  return lang == 'de' ? row[1] : row[0];
}

/// A text with values inside, written out in all three languages.
String tx(String turkish, String english, String german) =>
    switch (I18n.language.value) {
      'en' => english,
      'de' => german,
      _ => turkish,
    };

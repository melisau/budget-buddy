import 'package:budgetbuddy/core/i18n.dart';
import 'package:budgetbuddy/core/strings.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  tearDown(() => I18n.language.value = 'tr');

  test('texts follow the chosen language', () {
    I18n.language.value = 'tr';
    expect(t('Ayarlar'), 'Ayarlar');
    I18n.language.value = 'en';
    expect(t('Ayarlar'), 'Settings');
    I18n.language.value = 'de';
    expect(t('Ayarlar'), 'Einstellungen');
    expect(tx('a', 'b', 'c'), 'c');
  });

  test('an unknown text stays as written', () {
    I18n.language.value = 'de';
    expect(t('Bilinmeyen metin'), 'Bilinmeyen metin');
  });

  test('the phone language picks the first language', () {
    expect(I18n.fromDevice('tr'), 'tr');
    expect(I18n.fromDevice('de'), 'de');
    expect(I18n.fromDevice('fr'), 'en');
  });

  test('every entry has an English and a German text', () {
    for (final row in strings.values) {
      expect(row.length, 2);
      expect(row.every((text) => text.isNotEmpty), isTrue);
    }
  });
}

import 'dart:convert';

import 'package:budgetbuddy/features/csv.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('UTF-8 with a byte order mark is read as text', () {
    final bytes = [0xEF, 0xBB, 0xBF, ...utf8.encode('tarih,açıklama\n')];
    expect(decodeCsv(bytes), 'tarih,açıklama\n');
  });

  test('non UTF-8 bytes do not throw', () {
    expect(decodeCsv([0x74, 0xFD, 0x0A]), isA<String>());
  });
}

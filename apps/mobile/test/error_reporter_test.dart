import 'dart:async';
import 'dart:io';

import 'package:budgetbuddy/core/api.dart';
import 'package:budgetbuddy/core/error_reporter.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  late List<Map<String, String>> sent;
  late ErrorReporter reporter;

  setUp(() {
    sent = [];
    reporter = ErrorReporter((report) async => sent.add(report), maxReports: 2);
  });

  test('redacts personal values and tokens', () {
    final text = ErrorReporter.redact(
      'user a.b@example.com Bearer abc.def eyJhbGci.eyJzdWIi.sig '
      'https://x.test/p?email=z amount 12.345,67',
    );
    expect(text, isNot(contains('example.com')));
    expect(text, isNot(contains('abc.def')));
    expect(text, isNot(contains('eyJ')));
    expect(text, isNot(contains('email=z')));
    expect(text, isNot(contains('12.345,67')));
    expect(text, contains('https://x.test/p'));
  });

  test('does not include the source of a FormatException', () {
    final message = ErrorReporter.describe(
      const FormatException('Bad value', 'private note'),
    );
    expect(message, contains('Bad value'));
    expect(message, isNot(contains('private note')));
  });

  test('skips expected network and API failures', () async {
    await reporter.report(ApiException('nope', 500), null);
    await reporter.report(const SocketException('offline'), null);
    await reporter.report(TimeoutException('slow'), null);
    expect(sent, isEmpty);
  });

  test('sends a repeated error once and respects the cap', () async {
    await reporter.report(StateError('one'), null);
    await reporter.report(StateError('one'), null);
    await reporter.report(StateError('two'), null);
    await reporter.report(StateError('three'), null);
    expect(sent, hasLength(2));
    expect(sent.first['source'], 'client');
  });

  test('a failed transport does not throw', () async {
    final failing = ErrorReporter((_) async => throw StateError('down'));
    await expectLater(failing.report(StateError('x'), null), completes);
  });
}

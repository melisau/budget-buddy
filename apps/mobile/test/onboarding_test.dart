import 'package:budgetbuddy/core/onboarding.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('the stored choice round-trips', () {
    expect(Onboarding.decode(Onboarding.encode('en', 'EUR')), {
      'language': 'en',
      'currency': 'EUR',
    });
  });

  test('unsupported values are never sent to the account', () {
    expect(Onboarding.decode('de:EUR'), {'currency': 'EUR'});
    expect(Onboarding.decode('xx:YYY'), isNull);
    expect(Onboarding.decode('broken'), isNull);
  });
}

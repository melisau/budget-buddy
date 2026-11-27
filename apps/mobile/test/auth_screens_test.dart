import 'package:budgetbuddy/features/auth_screens.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('e-mail addresses are checked like on the web', () {
    expect(isEmail('ad@ornek.com'), isTrue);
    expect(isEmail(' ad@ornek.com '), isTrue);
    expect(isEmail('ad@ornek'), isFalse);
    expect(isEmail('ad ornek@x.com'), isFalse);
  });
}

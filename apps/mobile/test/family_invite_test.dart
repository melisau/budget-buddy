import 'package:budgetbuddy/features/social_screens.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('accepts the same invite email shape as the server', () {
    expect(isInviteEmail(' kisi@example.com '), isTrue);
    expect(isInviteEmail('kisi@example'), isFalse);
    expect(isInviteEmail('kisi example@test.com'), isFalse);
    expect(isInviteEmail(''), isFalse);
  });
}

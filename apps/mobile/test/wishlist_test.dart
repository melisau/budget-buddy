import 'package:budgetbuddy/features/social_screens.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('share links open the public read-only page', () {
    expect(wishlistShareUrl('abc_123'), endsWith('/w/abc_123'));
  });
}

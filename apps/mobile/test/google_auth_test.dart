import 'package:budgetbuddy/core/google_auth.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('hashes the nonce as lowercase SHA-256 hex', () {
    expect(
      hashNonce('abc'),
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
}

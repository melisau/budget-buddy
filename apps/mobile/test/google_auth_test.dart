import 'package:budgetbuddy/core/google_auth.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

void main() {
  test('hashes the nonce as lowercase SHA-256 hex', () {
    expect(
      hashNonce('abc'),
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  test('reports the Google failure code', () {
    const error = GoogleSignInException(
      code: GoogleSignInExceptionCode.clientConfigurationError,
      description: '[28444] Developer console is not set up correctly.',
    );
    expect(
      googleErrorCode(error),
      'google:clientConfigurationError '
      '[28444] Developer console is not set up correctly.',
    );
  });

  test('reports the Supabase failure without private values', () {
    const error = AuthException(
      'Bad token eyJabc.def.ghi for a@example.test',
      statusCode: '400',
      code: 'bad_jwt',
    );
    expect(
      googleErrorCode(error),
      'supabase:400:bad_jwt Bad token [token] for [e-posta]',
    );
  });
}

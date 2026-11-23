import 'dart:convert';
import 'dart:math';

import 'package:crypto/crypto.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'config.dart';

/// SHA-256 hex digest sent to Google; Supabase receives the raw value.
String hashNonce(String raw) => sha256.convert(utf8.encode(raw)).toString();

String _newNonce() {
  final random = Random.secure();
  final bytes = List<int>.generate(32, (_) => random.nextInt(256));
  return base64UrlEncode(bytes);
}

// google_sign_in accepts a nonce only in initialize, which may run once.
final String _rawNonce = _newNonce();
Future<void>? _initialized;

/// Short failure reason safe to show on screen: no tokens or e-mail addresses.
String googleErrorCode(Object error) {
  final raw = switch (error) {
    GoogleSignInException e => 'google:${e.code.name} ${e.description ?? ''}',
    AuthException e =>
      'supabase:${e.statusCode ?? '-'}:${e.code ?? '-'} ${e.message}',
    _ => 'app:${error.runtimeType}',
  };
  final clean = raw
      .replaceAll(RegExp(r'\S+@\S+'), '[e-posta]')
      .replaceAll(RegExp(r'eyJ[\w-]+(\.[\w-]+)*'), '[token]')
      .replaceAll(RegExp(r'\s+'), ' ')
      .trim();
  return clean.length <= 160 ? clean : clean.substring(0, 160);
}

Future<void> signInWithGoogle() async {
  final google = GoogleSignIn.instance;
  _initialized ??= google.initialize(
    serverClientId: AppConfig.googleWebClientId,
    nonce: hashNonce(_rawNonce),
  );
  await _initialized;
  // Clear the previous Google choice so the account picker is shown.
  await google.signOut();
  final account = await google.authenticate();
  final idToken = account.authentication.idToken;
  if (idToken == null) throw StateError('Google did not return an ID token.');
  await Supabase.instance.client.auth.signInWithIdToken(
    provider: OAuthProvider.google,
    idToken: idToken,
    nonce: _rawNonce,
  );
}

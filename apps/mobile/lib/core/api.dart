import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:supabase_flutter/supabase_flutter.dart';

import 'config.dart';

class ApiException implements Exception {
  ApiException(this.message, [this.status, this.outcomeUnknown = false]);

  final String message;
  final int? status;

  /// The server may already have applied this write; do not offer a blind retry.
  final bool outcomeUnknown;

  @override
  String toString() => message;
}

class Api {
  final HttpClient _client = HttpClient()
    ..connectionTimeout = const Duration(seconds: 15);

  Future<Map<String, dynamic>> get(String path) => _send('GET', path);

  /// [requestId] makes a retried create safe: the server stores it only once.
  Future<Map<String, dynamic>> post(
    String path,
    Map<String, dynamic> body, {
    String? requestId,
  }) => _send('POST', path, body, requestId);

  Future<Map<String, dynamic>> patch(String path, Map<String, dynamic> body) =>
      _send('PATCH', path, body);

  Future<Map<String, dynamic>> put(String path, Map<String, dynamic> body) =>
      _send('PUT', path, body);

  Future<Map<String, dynamic>> delete(
    String path, [
    Map<String, dynamic>? body,
  ]) => _send('DELETE', path, body);

  Future<Map<String, dynamic>> _send(
    String method,
    String path, [
    Map<String, dynamic>? body,
    String? requestId,
  ]) async {
    final auth = Supabase.instance.client.auth;
    var session = auth.currentSession;
    var sent = false;
    final isWrite = method != 'GET';
    if (session == null) throw ApiException('Oturum açmanız gerekiyor.', 401);
    try {
      if (session.isExpired) {
        session = (await auth.refreshSession()).session ?? session;
      }
      final uri = Uri.parse('${AppConfig.apiUrl}/api/$path');
      final request = await _client.openUrl(method, uri);
      request.headers.set(
        HttpHeaders.authorizationHeader,
        'Bearer ${session.accessToken}',
      );
      request.headers.set(HttpHeaders.acceptHeader, 'application/json');
      if (requestId != null) request.headers.set('Idempotency-Key', requestId);
      if (body != null) {
        request.headers.contentType = ContentType.json;
        request.add(utf8.encode(jsonEncode(body)));
      }
      sent = true;
      final response = await request.close().timeout(
        Duration(seconds: isWrite ? 60 : 45),
      );
      final text = await response.transform(utf8.decoder).join();
      if (response.statusCode >= 400) {
        if (response.statusCode == 401) {
          await auth.signOut(scope: SignOutScope.local);
        }
        throw ApiException(
          _messageFor(response.statusCode),
          response.statusCode,
        );
      }
      return text.isEmpty
          ? <String, dynamic>{}
          : jsonDecode(text) as Map<String, dynamic>;
    } on SocketException {
      if (sent && isWrite) throw _unknownOutcome();
      throw ApiException('İnternet bağlantısı yok. Lütfen tekrar deneyin.');
    } on TimeoutException {
      if (sent && isWrite) throw _unknownOutcome();
      throw ApiException('Sunucu yanıt vermedi. Lütfen tekrar deneyin.');
    } on HttpException {
      if (sent && isWrite) throw _unknownOutcome();
      throw ApiException('Sunucuya ulaşılamadı. Lütfen tekrar deneyin.');
    } on FormatException {
      throw ApiException('Sunucudan beklenmeyen bir yanıt geldi.');
    } on AuthException {
      throw ApiException('Oturumunuz yenilenemedi. Tekrar giriş yapın.', 401);
    }
  }

  ApiException _unknownOutcome() => ApiException(
    'Yanıt alınamadı. İşlem kaydedilmiş olabilir, listeyi kontrol edin.',
    null,
    true,
  );

  String _messageFor(int status) => switch (status) {
    400 => 'Lütfen alanları kontrol edin.',
    401 => 'Oturumunuz sona erdi. Tekrar giriş yapın.',
    403 => 'Bu işlem için yetkiniz yok.',
    404 => 'Kayıt bulunamadı. Listeyi yenileyin.',
    409 => 'Bu işlem zaten kaydedildi. Listeyi yenileyin.',
    429 => 'Çok fazla istek gönderildi. Biraz sonra deneyin.',
    _ => 'Bir sorun oluştu. Lütfen tekrar deneyin.',
  };
}

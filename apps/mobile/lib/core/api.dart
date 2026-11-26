import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:supabase_flutter/supabase_flutter.dart';

import 'config.dart';
import 'i18n.dart';

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

  /// A GET whose response is text (for example a CSV download), not JSON.
  Future<List<int>> getBytes(String path) async {
    final auth = Supabase.instance.client.auth;
    var session = auth.currentSession;
    if (session == null) {
      throw ApiException(t('Oturum açmanız gerekiyor.'), 401);
    }
    try {
      if (session.isExpired) {
        session = (await auth.refreshSession()).session ?? session;
      }
      final request = await _client.openUrl(
        'GET',
        Uri.parse('${AppConfig.apiUrl}/api/$path'),
      );
      request.headers.set(
        HttpHeaders.authorizationHeader,
        'Bearer ${session.accessToken}',
      );
      final response = await request.close().timeout(
        const Duration(seconds: 60),
      );
      final bytes = await response.fold<List<int>>(
        <int>[],
        (all, chunk) => all..addAll(chunk),
      );
      if (response.statusCode >= 400) {
        throw ApiException(
          _messageFor(response.statusCode),
          response.statusCode,
        );
      }
      return bytes;
    } on SocketException {
      throw ApiException(t('İnternet bağlantısı yok. Lütfen tekrar deneyin.'));
    } on TimeoutException {
      throw ApiException(t('Sunucu yanıt vermedi. Lütfen tekrar deneyin.'));
    }
  }

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

  /// Sends one file as multipart/form-data under the field name `file`.
  Future<Map<String, dynamic>> upload(
    String path,
    List<int> bytes, {
    required String filename,
    required String contentType,
  }) async {
    final auth = Supabase.instance.client.auth;
    var session = auth.currentSession;
    if (session == null) {
      throw ApiException(t('Oturum açmanız gerekiyor.'), 401);
    }
    try {
      if (session.isExpired) {
        session = (await auth.refreshSession()).session ?? session;
      }
      final boundary = 'bb${DateTime.now().microsecondsSinceEpoch}';
      final head = utf8.encode(
        '--$boundary\r\nContent-Disposition: form-data; name="file"; filename="$filename"\r\nContent-Type: $contentType\r\n\r\n',
      );
      final tail = utf8.encode('\r\n--$boundary--\r\n');
      final request = await _client.openUrl(
        'POST',
        Uri.parse('${AppConfig.apiUrl}/api/$path'),
      );
      request.headers.set(
        HttpHeaders.authorizationHeader,
        'Bearer ${session.accessToken}',
      );
      request.headers.set(HttpHeaders.acceptHeader, 'application/json');
      request.headers.set(
        HttpHeaders.contentTypeHeader,
        'multipart/form-data; boundary=$boundary',
      );
      request.contentLength = head.length + bytes.length + tail.length;
      request
        ..add(head)
        ..add(bytes)
        ..add(tail);
      final response = await request.close().timeout(
        const Duration(seconds: 60),
      );
      final text = await response.transform(utf8.decoder).join();
      if (response.statusCode >= 400) {
        throw ApiException(
          response.statusCode == 400
              ? t('JPG, PNG veya WebP biçiminde, en fazla 2 MB bir görsel seç.')
              : _messageFor(response.statusCode),
          response.statusCode,
        );
      }
      return text.isEmpty
          ? <String, dynamic>{}
          : jsonDecode(text) as Map<String, dynamic>;
    } on SocketException {
      throw ApiException(t('İnternet bağlantısı yok. Lütfen tekrar deneyin.'));
    } on TimeoutException {
      throw ApiException(t('Sunucu yanıt vermedi. Lütfen tekrar deneyin.'));
    }
  }

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
    if (session == null) {
      throw ApiException(t('Oturum açmanız gerekiyor.'), 401);
    }
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
      throw ApiException(t('İnternet bağlantısı yok. Lütfen tekrar deneyin.'));
    } on TimeoutException {
      if (sent && isWrite) throw _unknownOutcome();
      throw ApiException(t('Sunucu yanıt vermedi. Lütfen tekrar deneyin.'));
    } on HttpException {
      if (sent && isWrite) throw _unknownOutcome();
      throw ApiException(t('Sunucuya ulaşılamadı. Lütfen tekrar deneyin.'));
    } on FormatException {
      throw ApiException(t('Sunucudan beklenmeyen bir yanıt geldi.'));
    } on AuthException {
      throw ApiException(
        t('Oturumunuz yenilenemedi. Tekrar giriş yapın.'),
        401,
      );
    }
  }

  ApiException _unknownOutcome() => ApiException(
    t('Yanıt alınamadı. İşlem kaydedilmiş olabilir, listeyi kontrol edin.'),
    null,
    true,
  );

  String _messageFor(int status) => switch (status) {
    400 => t('Lütfen alanları kontrol edin.'),
    401 => t('Oturumunuz sona erdi. Tekrar giriş yapın.'),
    403 => t('Bu işlem için yetkiniz yok.'),
    404 => t('Kayıt bulunamadı. Listeyi yenileyin.'),
    409 => t('Bu işlem zaten kaydedildi. Listeyi yenileyin.'),
    429 => t('Çok fazla istek gönderildi. Biraz sonra deneyin.'),
    _ => t('Bir sorun oluştu. Lütfen tekrar deneyin.'),
  };
}

import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;
import 'package:uuid/uuid.dart';

/// Solapi SMS 발송 서비스
///
/// 실행 시 환경변수 주입:
///   flutter run --dart-define=SOLAPI_API_KEY=YOUR_KEY
///               --dart-define=SOLAPI_API_SECRET=YOUR_SECRET
///               --dart-define=SOLAPI_FROM=01012345678
///
/// 환경변수 없으면 → 개발 모드: 콘솔에만 출력 (실제 발송 안 함)
class SmsService {
  static const _apiKey = String.fromEnvironment('SOLAPI_API_KEY');
  static const _apiSecret = String.fromEnvironment('SOLAPI_API_SECRET');
  static const _fromNumber = String.fromEnvironment('SOLAPI_FROM');

  static const _endpoint = 'https://api.solapi.com/messages/v4/send';

  bool get _isConfigured =>
      _apiKey.isNotEmpty && _apiSecret.isNotEmpty && _fromNumber.isNotEmpty;

  /// User B에게 초대 SMS 발송
  Future<SmsResult> sendInvite({
    required String toPhone,
    required String sessionTitle,
    required String inviteUrl,
  }) async {
    final text = _buildMessage(sessionTitle, inviteUrl);

    if (!_isConfigured) {
      // 개발/테스트 모드: 실제 발송 없이 성공 처리
      debugPrint('─── [SMS 개발 모드] ───────────────────────');
      debugPrint('수신: $toPhone');
      debugPrint('내용: $text');
      debugPrint('초대 링크: $inviteUrl');
      debugPrint('────────────────────────────────────────');
      return SmsResult.devMode(to: toPhone, text: text);
    }

    return _send(to: toPhone, text: text);
  }

  Future<SmsResult> _send({required String to, required String text}) async {
    final cleanTo = to.replaceAll(RegExp(r'[^0-9]'), '');
    final cleanFrom = _fromNumber.replaceAll(RegExp(r'[^0-9]'), '');

    final date = DateTime.now().toUtc().toIso8601String();
    final salt = const Uuid().v4().replaceAll('-', '');
    final signature = _sign(date, salt);

    try {
      final response = await http.post(
        Uri.parse(_endpoint),
        headers: {
          'Content-Type': 'application/json',
          'Authorization':
              'HMAC-SHA256 apiKey=$_apiKey, date=$date, salt=$salt, signature=$signature',
        },
        body: jsonEncode({
          'message': {
            'to': cleanTo,
            'from': cleanFrom,
            'text': text,
          }
        }),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        try {
          final body = jsonDecode(response.body) as Map<String, dynamic>;
          return SmsResult.success(
            messageId: body['messageId'] as String? ?? '',
            to: cleanTo,
          );
        } catch (_) {
          return SmsResult.success(messageId: '', to: cleanTo);
        }
      } else {
        // 오류 응답이 HTML일 수도 있으므로 JSON 파싱 시도 후 폴백
        String errorMsg = 'HTTP ${response.statusCode}';
        try {
          final body = jsonDecode(response.body) as Map<String, dynamic>;
          errorMsg = body['errorMessage'] as String? ??
              body['message'] as String? ??
              errorMsg;
        } catch (_) {
          // HTML 응답 등 JSON이 아닌 경우 기본 메시지 사용
        }
        return SmsResult.failure(error: errorMsg);
      }
    } catch (e) {
      return SmsResult.failure(error: e.toString());
    }
  }

  /// Solapi HMAC-SHA256 서명 생성
  /// signature = HMAC-SHA256(apiSecret, date + salt)
  String _sign(String date, String salt) {
    final key = utf8.encode(_apiSecret);
    final message = utf8.encode(date + salt);
    return Hmac(sha256, key).convert(message).toString();
  }

  String _buildMessage(String sessionTitle, String inviteUrl) {
    final title = sessionTitle.isNotEmpty ? '[$sessionTitle] ' : '';
    return '💍 $title특별한 초대장이 도착했어요!\n\n'
        '지금 바로 확인하세요 👇\n'
        '$inviteUrl';
  }
}

// ─── 결과 모델 ────────────────────────────────────────────────────────────────

enum SmsStatus { success, failure, devMode }

class SmsResult {
  final SmsStatus status;
  final String? messageId;
  final String? to;
  final String? text;
  final String? error;

  const SmsResult._({
    required this.status,
    this.messageId,
    this.to,
    this.text,
    this.error,
  });

  factory SmsResult.success({required String messageId, required String to}) =>
      SmsResult._(status: SmsStatus.success, messageId: messageId, to: to);

  factory SmsResult.failure({required String error}) =>
      SmsResult._(status: SmsStatus.failure, error: error);

  factory SmsResult.devMode({required String to, required String text}) =>
      SmsResult._(status: SmsStatus.devMode, to: to, text: text);

  bool get isSuccess =>
      status == SmsStatus.success || status == SmsStatus.devMode;
}

// ─── Provider ────────────────────────────────────────────────────────────────

final smsServiceProvider = Provider<SmsService>((ref) => SmsService());

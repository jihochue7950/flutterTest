import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../../core/config/app_config.dart';

class PurchaseAuthResult {
  final String orderNumber;
  final String productName;
  final String productSlug;
  final String targetName;
  final String? userCode;

  const PurchaseAuthResult({
    required this.orderNumber,
    required this.productName,
    required this.productSlug,
    required this.targetName,
    this.userCode,
  });

  factory PurchaseAuthResult.fromJson(Map<String, dynamic> json) {
    return PurchaseAuthResult(
      orderNumber: json['order_number'] as String,
      productName: json['product_name'] as String,
      productSlug: json['product_slug'] as String? ?? '',
      targetName: json['target_name'] as String? ?? '',
      userCode: json['user_code'] as String?,
    );
  }
}

class PurchaseAuthService {
  final String _baseUrl;

  PurchaseAuthService({String? baseUrl})
      : _baseUrl = baseUrl ?? AppConfig.adminServerUrl;

  /// 주문번호 + 인증코드로 구매 인증. 성공 시 [PurchaseAuthResult] 반환.
  Future<PurchaseAuthResult> verify(String orderNumber, String accessCode) async {
    final response = await http
        .post(
          Uri.parse('$_baseUrl/api/orders/verify-access'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({
            'order_number': orderNumber.trim().toUpperCase(),
            'access_code': accessCode.trim().toUpperCase(),
          }),
        )
        .timeout(const Duration(seconds: 15));

    final body = jsonDecode(response.body) as Map<String, dynamic>;

    if (response.statusCode == 200 && body['success'] == true) {
      return PurchaseAuthResult.fromJson(body['data'] as Map<String, dynamic>);
    }

    throw PurchaseAuthException(
      body['message'] as String? ?? '인증에 실패했습니다.',
    );
  }
}

class PurchaseAuthException implements Exception {
  final String message;
  const PurchaseAuthException(this.message);

  @override
  String toString() => message;
}

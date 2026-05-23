import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../services/purchase_auth_service.dart';
import '../../../core/models/session_model.dart';

class PurchaseSuccessScreen extends StatelessWidget {
  final PurchaseAuthResult result;
  const PurchaseSuccessScreen({super.key, required this.result});

  static const _pink = Color(0xFFE91E63);

  @override
  Widget build(BuildContext context) {
    final eventType = EventCategoryX.fromSlug(result.productSlug);
    final targetPrefix = result.targetName.isNotEmpty ? '${result.targetName}님을 위한 ' : '';

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
          child: Column(
            children: [
              const Spacer(),

              // 성공 아이콘
              Container(
                width: 100, height: 100,
                decoration: BoxDecoration(
                  color: const Color(0xFFFFE0F0),
                  borderRadius: BorderRadius.circular(50),
                ),
                child: const Center(child: Text('✅', style: TextStyle(fontSize: 48))),
              ),
              const SizedBox(height: 24),

              Text('인증 완료!',
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.w900, color: _pink)),
              const SizedBox(height: 12),

              Text(
                '$targetPrefix${result.productName}이\n준비되었습니다.',
                style: const TextStyle(fontSize: 17, color: Color(0xFF555555), height: 1.6),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 40),

              // 주문 정보 카드
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8F9FA),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Column(
                  children: [
                    _infoRow('주문번호', result.orderNumber),
                    const Divider(height: 20),
                    _infoRow('상품', result.productName),
                    if (result.targetName.isNotEmpty) ...[
                      const Divider(height: 20),
                      _infoRow('대상', result.targetName),
                    ],
                  ],
                ),
              ),

              const Spacer(),

              // 이벤트 타입별 시작 버튼
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: () => context.go('/session/create', extra: {
                    'userCode':    result.userCode,
                    'productSlug': result.productSlug,
                    'targetName':  result.targetName,
                  }),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _pink,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    textStyle: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
                  ),
                  child: Text(eventType.actionLabel),
                ),
              ),
              const SizedBox(height: 12),

              TextButton(
                onPressed: () => context.go('/'),
                child: const Text('홈으로 돌아가기', style: TextStyle(color: Color(0xFF888888))),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _infoRow(String label, String value) => Row(
    mainAxisAlignment: MainAxisAlignment.spaceBetween,
    children: [
      Text(label, style: const TextStyle(fontSize: 14, color: Color(0xFF888888))),
      Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF1A1A2E))),
    ],
  );
}

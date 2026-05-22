import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  static const _pink = Color(0xFFE91E63);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 로고
              const Text('💍', style: TextStyle(fontSize: 52)),
              const SizedBox(height: 12),
              Text(
                'AI 프로포즈',
                style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: _pink,
                ),
              ),
              Text(
                '세상에 하나뿐인 AI 기반 프로포즈 경험',
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: Colors.grey[600],
                ),
              ),
              const SizedBox(height: 40),

              // 기능 소개
              _featureRow(Icons.smart_toy_outlined, 'AI 아바타 대화', '3D AI 아바타가 상대방과 실시간 대화'),
              const SizedBox(height: 16),
              _featureRow(Icons.videocam_outlined, '개인화 영상 메시지', '직접 찍은 영상으로 감동을 전달'),
              const SizedBox(height: 16),
              _featureRow(Icons.cast_outlined, 'TV 캐스팅', 'Chromecast로 TV 대화면에 연출'),
              const SizedBox(height: 16),
              _featureRow(Icons.sms_outlined, 'SMS 초대', '링크로 상대방을 간편하게 초대'),

              const Spacer(),

              // ── 주문번호로 시작 (구매 인증) ──
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFFE91E63), Color(0xFF9C27B0)],
                  ),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('🛒 상품 구매 후 시작하기',
                      style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 4),
                    const Text('주문번호·인증코드로 바로 시작',
                      style: TextStyle(color: Colors.white70, fontSize: 12)),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton(
                        onPressed: () => context.push('/purchase/auth'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.white,
                          foregroundColor: _pink,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                        ),
                        child: const Text('주문번호 입력하기'),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),

              // ── 관리자용: 기존 세션 직접 생성 ──
              SizedBox(
                width: double.infinity,
                height: 48,
                child: OutlinedButton(
                  onPressed: () => context.push('/session/create'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.grey[600],
                    side: BorderSide(color: Colors.grey[300]!),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    textStyle: const TextStyle(fontSize: 14),
                  ),
                  child: const Text('세션 직접 생성 (관리자)'),
                ),
              ),
              const SizedBox(height: 12),
            ],
          ),
        ),
      ),
    );
  }

  Widget _featureRow(IconData icon, String title, String subtitle) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: const Color(0xFFFFE0F0),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, color: _pink, size: 22),
        ),
        const SizedBox(width: 14),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
            Text(subtitle, style: TextStyle(color: Colors.grey[500], fontSize: 13)),
          ],
        ),
      ],
    );
  }
}

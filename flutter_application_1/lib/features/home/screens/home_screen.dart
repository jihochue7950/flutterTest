import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('💍', style: TextStyle(fontSize: 52)),
              const SizedBox(height: 12),
              Text(
                'Proposal',
                style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: const Color(0xFFB5004E),
                    ),
              ),
              Text(
                'AI 기반 프로포즈 경험',
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: Colors.grey[600],
                    ),
              ),
              const Spacer(),
              _buildFeatureRow(Icons.cast, 'Chromecast', 'TV 화면에 AI 캐릭터 표시'),
              const SizedBox(height: 16),
              _buildFeatureRow(Icons.smart_toy_outlined, 'AI 대화', '상대방과 AI가 자연스럽게 대화'),
              const SizedBox(height: 16),
              _buildFeatureRow(Icons.sms_outlined, 'SMS 초대', '링크로 상대방을 초대'),
              const Spacer(),
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: () => context.push('/session/create'),
                  child: const Text(
                    '새 프로포즈 시작하기',
                    style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
                  ),
                ),
              ),
              const SizedBox(height: 12),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFeatureRow(IconData icon, String title, String subtitle) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: const Color(0xFFFFE0F0),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, color: const Color(0xFFE91E8C), size: 22),
        ),
        const SizedBox(width: 14),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title,
                style: const TextStyle(
                    fontWeight: FontWeight.w600, fontSize: 15)),
            Text(subtitle,
                style: TextStyle(color: Colors.grey[500], fontSize: 13)),
          ],
        ),
      ],
    );
  }
}

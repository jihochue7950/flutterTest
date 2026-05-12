import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/session_provider.dart';
import '../../../shared/widgets/loading_overlay.dart';

class SessionCreateScreen extends ConsumerStatefulWidget {
  const SessionCreateScreen({super.key});

  @override
  ConsumerState<SessionCreateScreen> createState() =>
      _SessionCreateScreenState();
}

class _SessionCreateScreenState extends ConsumerState<SessionCreateScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _videoIdController = TextEditingController();
  final _phoneController = TextEditingController();

  @override
  void dispose() {
    _titleController.dispose();
    _videoIdController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final notifier = ref.read(sessionProvider.notifier);
    await notifier.createSession(
      title: _titleController.text.trim(),
      videoId: _videoIdController.text.trim(),
    );
    await notifier.updatePhone(_phoneController.text.trim());

    if (!mounted) return;
    final session = ref.read(sessionProvider).session;
    if (session != null) {
      context.go('/session/${session.id}');
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(sessionProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('새 프로포즈 세션')),
      body: LoadingOverlay(
        isLoading: state.isLoading,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 8),
                Text(
                  '특별한 순간을 준비하세요 💍',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const SizedBox(height: 4),
                Text(
                  '영상은 사전에 관리자가 서버에 업로드한 것을 사용합니다.',
                  style: TextStyle(color: Colors.grey[500], fontSize: 13),
                ),
                const SizedBox(height: 32),

                _label('세션 이름'),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _titleController,
                  decoration: const InputDecoration(
                    hintText: '예: 우리의 특별한 날',
                  ),
                  validator: (v) =>
                      (v == null || v.trim().isEmpty) ? '세션 이름을 입력하세요' : null,
                ),
                const SizedBox(height: 24),

                _label('영상 ID (관리자 제공)'),
                const SizedBox(height: 4),
                Text(
                  '관리자가 미리 서버에 업로드한 영상의 ID를 입력하세요.',
                  style: TextStyle(color: Colors.grey[500], fontSize: 12),
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _videoIdController,
                  decoration: const InputDecoration(
                    hintText: '예: vid_abc123',
                    prefixIcon: Icon(Icons.videocam_outlined),
                  ),
                  validator: (v) =>
                      (v == null || v.trim().isEmpty) ? '영상 ID를 입력하세요' : null,
                ),
                const SizedBox(height: 24),

                _label('상대방 전화번호'),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _phoneController,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(
                    hintText: '010-0000-0000',
                    prefixIcon: Icon(Icons.phone_outlined),
                  ),
                  validator: (v) {
                    if (v == null || v.trim().isEmpty) return '전화번호를 입력하세요';
                    final digits = v.replaceAll(RegExp(r'\D'), '');
                    if (digits.length < 10) return '올바른 전화번호를 입력하세요';
                    return null;
                  },
                ),
                const SizedBox(height: 32),

                // 흐름 안내
                _FlowGuide(),
                const SizedBox(height: 32),

                SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: ElevatedButton(
                    onPressed: _submit,
                    child: const Text(
                      'Chromecast 연결로 이동 →',
                      style: TextStyle(
                          fontSize: 16, fontWeight: FontWeight.w700),
                    ),
                  ),
                ),
                if (state.error != null) ...[
                  const SizedBox(height: 16),
                  Text(
                    state.error!,
                    style: const TextStyle(color: Colors.red, fontSize: 13),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _label(String text) => Text(
        text,
        style: const TextStyle(
          fontWeight: FontWeight.w600,
          fontSize: 14,
          color: Color(0xFF333333),
        ),
      );
}

class _FlowGuide extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.blue[50],
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.blue[100]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.info_outline, size: 16, color: Colors.blue[700]),
              const SizedBox(width: 6),
              Text(
                '진행 흐름',
                style: TextStyle(
                  fontWeight: FontWeight.w700,
                  color: Colors.blue[700],
                  fontSize: 13,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          ..._steps.map((s) => _StepRow(text: s)),
        ],
      ),
    );
  }

  static const _steps = [
    '① 세션 생성 → Chromecast 연결',
    '② User B에게 SMS 초대 발송',
    '③ User B 접속 → AI 대화 시작',
    '④ AI가 자동으로 영상 재생 트리거',
    '⑤ TV에서 영상 자동 재생 💍',
  ];
}

class _StepRow extends StatelessWidget {
  final String text;
  const _StepRow({required this.text});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Text(
        text,
        style: TextStyle(fontSize: 12, color: Colors.blue[800]),
      ),
    );
  }
}

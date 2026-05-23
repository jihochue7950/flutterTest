import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/session_provider.dart';
import '../../../core/models/session_model.dart';
import '../../../shared/widgets/loading_overlay.dart';

class SessionCreateScreen extends ConsumerStatefulWidget {
  const SessionCreateScreen({super.key});

  @override
  ConsumerState<SessionCreateScreen> createState() => _SessionCreateScreenState();
}

class _SessionCreateScreenState extends ConsumerState<SessionCreateScreen> {
  final _formKey            = GlobalKey<FormState>();
  final _userCodeController = TextEditingController();
  final _phoneController    = TextEditingController();

  EventCategory _eventType    = EventCategory.proposal;
  String?   _productSlug;
  bool      _userCodeLocked = false; // 구매 인증에서 넘어오면 수정 불가

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // purchase_success_screen에서 extra로 넘겨받은 데이터 적용 (1회만)
    if (_userCodeLocked) return;
    final extra = GoRouterState.of(context).extra as Map<String, dynamic>?;
    if (extra != null) {
      final code = extra['userCode'] as String?;
      final slug = extra['productSlug'] as String?;
      if (code != null && code.isNotEmpty) {
        _userCodeController.text = code;
        _userCodeLocked = true;
      }
      if (slug != null) {
        _productSlug = slug;
        _eventType = EventCategoryX.fromSlug(slug);
      }
    }
  }

  @override
  void dispose() {
    _userCodeController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final notifier = ref.read(sessionProvider.notifier);
    await notifier.createSession(
      userCode:    _userCodeController.text.trim(),
      eventType:   _eventType,
      productSlug: _productSlug,
    );
    await notifier.updatePhone(_phoneController.text.trim());

    if (!mounted) return;
    final session = ref.read(sessionProvider).session;
    if (session != null) context.go('/session/${session.id}');
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(sessionProvider);

    return Scaffold(
      appBar: AppBar(title: Text(_eventType.flowTitle.split(' ').first)),
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
                  _eventType.flowTitle,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '영상과 질문은 관리자가 서버에 등록한 것을 사용합니다.',
                  style: TextStyle(color: Colors.grey[500], fontSize: 13),
                ),
                const SizedBox(height: 32),

                // ── 사용자 코드 ──────────────────────────────────────────────
                _label('사용자 코드'),
                const SizedBox(height: 4),
                Text(
                  _userCodeLocked
                      ? '구매 인증에서 확인된 코드입니다.'
                      : '관리자 시스템에서 발급받은 user_code를 입력하세요.',
                  style: TextStyle(color: Colors.grey[500], fontSize: 12),
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _userCodeController,
                  readOnly: _userCodeLocked,
                  keyboardType: TextInputType.text,
                  decoration: InputDecoration(
                    hintText: '예: jihochu',
                    prefixIcon: const Icon(Icons.person_outline),
                    filled: _userCodeLocked,
                    fillColor: _userCodeLocked ? Colors.grey[100] : null,
                  ),
                  validator: (v) =>
                      (v == null || v.trim().isEmpty) ? '사용자 코드를 입력하세요' : null,
                ),
                const SizedBox(height: 24),

                // ── 상대방 전화번호 (eventType별 라벨) ──────────────────────
                _label(_eventType.recipientLabel),
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
                    if (v.replaceAll(RegExp(r'\D'), '').length < 10) {
                      return '올바른 전화번호를 입력하세요';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 32),

                _FlowGuide(eventType: _eventType),
                const SizedBox(height: 32),

                SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: ElevatedButton(
                    onPressed: _submit,
                    child: const Text(
                      'Chromecast 연결로 이동 →',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                    ),
                  ),
                ),
                if (state.error != null) ...[
                  const SizedBox(height: 16),
                  Text(state.error!, style: const TextStyle(color: Colors.red, fontSize: 13)),
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
    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: Color(0xFF333333)),
  );
}

class _FlowGuide extends StatelessWidget {
  final EventCategory eventType;
  const _FlowGuide({required this.eventType});

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
              Text('진행 흐름', style: TextStyle(fontWeight: FontWeight.w700, color: Colors.blue[700], fontSize: 13)),
            ],
          ),
          const SizedBox(height: 10),
          ...(_steps(eventType)).map((s) => Padding(
            padding: const EdgeInsets.only(bottom: 4),
            child: Text(s, style: TextStyle(fontSize: 12, color: Colors.blue[800])),
          )),
        ],
      ),
    );
  }

  static List<String> _steps(EventCategory et) => switch (et) {
    EventCategory.birthday => [
      '① 사용자 코드 입력 → 세션 생성 → Chromecast 연결',
      '② 생일 주인공에게 SMS 초대 발송',
      '③ 접속 → AI와 생일 대화 시작',
      '④ 모든 대화 완료 → 깜짝 영상 자동 재생 🎂',
    ],
    EventCategory.anniversary => [
      '① 사용자 코드 입력 → 세션 생성 → Chromecast 연결',
      '② 기념일 주인공에게 SMS 초대 발송',
      '③ 접속 → AI와 기념일 대화 시작',
      '④ 모든 대화 완료 → 특별한 영상 자동 재생 🎉',
    ],
    _ => [
      '① 사용자 코드 입력 → 세션 생성 → Chromecast 연결',
      '② 상대방에게 SMS 초대 발송',
      '③ 상대방 접속 → AI 커스텀 질문으로 대화 시작',
      '④ 모든 질문 완료 → AI가 영상 자동 트리거',
      '⑤ TV에서 해당 사용자 영상 자동 재생 💍',
    ],
  };
}

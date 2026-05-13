import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/invite_provider.dart';

// ── 프로포즈 연출 전체화면 ──────────────────────────────────────────────────

/// 4번 답변 완료 후 TV 영상 재생 시작과 동시에 User B 화면에 표시되는 연출 화면
class _ProposalMomentScreen extends StatefulWidget {
  final String lastAiMessage;
  const _ProposalMomentScreen({required this.lastAiMessage});

  @override
  State<_ProposalMomentScreen> createState() => _ProposalMomentScreenState();
}

class _ProposalMomentScreenState extends State<_ProposalMomentScreen>
    with TickerProviderStateMixin {
  late AnimationController _fadeCtrl;
  late AnimationController _heartCtrl;
  late Animation<double> _fadeAnim;

  @override
  void initState() {
    super.initState();
    _fadeCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    );
    _heartCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat(reverse: true);

    _fadeAnim = CurvedAnimation(parent: _fadeCtrl, curve: Curves.easeIn);
    _fadeCtrl.forward();
  }

  @override
  void dispose() {
    _fadeCtrl.dispose();
    _heartCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _fadeAnim,
      child: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFF1A0030), Color(0xFF3D0060)],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // 박동하는 하트
                AnimatedBuilder(
                  animation: _heartCtrl,
                  builder: (_, __) => Transform.scale(
                    scale: 1.0 + 0.12 * _heartCtrl.value,
                    child: Icon(
                      Icons.favorite,
                      color: const Color(0xFFFF4081),
                      size: 90 + 10 * _heartCtrl.value,
                    ),
                  ),
                ),
                const SizedBox(height: 36),
                // 마지막 AI 멘트
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 32),
                  child: Text(
                    widget.lastAiMessage,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.w300,
                      height: 1.7,
                    ),
                  ),
                ),
                const SizedBox(height: 32),
                // 안내 텍스트
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 24, vertical: 12),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(30),
                    border: Border.all(
                        color: Colors.white.withValues(alpha: 0.2)),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.tv, color: Colors.white70, size: 18),
                      SizedBox(width: 8),
                      Text(
                        'TV 화면을 봐주세요',
                        style: TextStyle(
                          color: Colors.white70,
                          fontSize: 14,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                // 꽃잎 이모지 장식
                const Text(
                  '🌸  💍  🌸',
                  style: TextStyle(fontSize: 28),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// User B가 SMS 초대 링크를 열었을 때 표시되는 화면
/// 경로: /invite/:token
class InviteScreen extends ConsumerStatefulWidget {
  final String token;

  const InviteScreen({super.key, required this.token});

  @override
  ConsumerState<InviteScreen> createState() => _InviteScreenState();
}

class _InviteScreenState extends ConsumerState<InviteScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _micPulseCtrl;
  final TextEditingController _textCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _micPulseCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    );
  }

  @override
  void dispose() {
    _micPulseCtrl.dispose();
    _textCtrl.dispose();
    super.dispose();
  }

  void _submitText() {
    final text = _textCtrl.text.trim();
    if (text.isEmpty) return;
    _textCtrl.clear();
    ref.read(inviteProvider(widget.token).notifier).submitText(text);
  }

  @override
  Widget build(BuildContext context) {
    final invite = ref.watch(inviteProvider(widget.token));
    final isListening = invite.isListening;
    final isMyTurn = invite.mode == InviteMode.myTurn;
    final isProcessing = invite.mode == InviteMode.processing;
    // STT 불가 → 텍스트 입력 모드로 전환 (로컬 테스트 / Windows 환경 등)
    final useTextInput = !invite.sttAvailable;

    // 마이크 활성 시 펄스 애니메이션 (STT 사용 가능 시만)
    if (!useTextInput) {
      if (isListening && !_micPulseCtrl.isAnimating) {
        _micPulseCtrl.repeat(reverse: true);
      } else if (!isListening && _micPulseCtrl.isAnimating) {
        _micPulseCtrl.stop();
        _micPulseCtrl.reset();
      }
    }

    // 4번 답변 완료 → 프로포즈 연출 전체화면
    if (invite.isVideoPlaying) {
      return Scaffold(
        body: _ProposalMomentScreen(lastAiMessage: invite.aiMessage),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF3F0FF),
      body: SafeArea(
        child: Column(
          children: [
            // 상단: AI 아바타 헤더
            _AvatarHeader(mode: invite.mode),

            // 중간: 대화 메시지 영역 (스크롤 가능)
            Expanded(
              child: _MessageArea(
                aiMessage: invite.aiMessage,
                myMessage: invite.myMessage,
                mode: invite.mode,
              ),
            ),

            // 하단: STT 불가 → 텍스트 입력 / STT 가능 → 마이크 버튼
            if (useTextInput)
              _TextInputSection(
                isMyTurn: isMyTurn,
                isProcessing: isProcessing,
                controller: _textCtrl,
                onSubmit: _submitText,
              )
            else
              _MicSection(
                isMyTurn: isMyTurn,
                isListening: isListening,
                isProcessing: isProcessing,
                pulseCtrl: _micPulseCtrl,
                onPressStart: () =>
                    ref.read(inviteProvider(widget.token).notifier).startListening(),
                onPressEnd: () =>
                    ref.read(inviteProvider(widget.token).notifier).stopListening(),
              ),
          ],
        ),
      ),
    );
  }
}

// ── 상단 아바타 헤더 ────────────────────────────────────────────────────────

class _AvatarHeader extends StatelessWidget {
  final InviteMode mode;

  const _AvatarHeader({required this.mode});

  @override
  Widget build(BuildContext context) {
    final isSpeaking = mode == InviteMode.aiSpeaking;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: isSpeaking
              ? const [Color(0xFF6C63FF), Color(0xFFE91E8C)]
              : const [Color(0xFF3F51B5), Color(0xFF6C63FF)],
        ),
        borderRadius: const BorderRadius.vertical(
          bottom: Radius.circular(28),
        ),
      ),
      child: Row(
        children: [
          // 미니 아바타 원형
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: Colors.white.withValues(alpha: 0.2),
              border: Border.all(color: Colors.white, width: 2),
            ),
            child: Icon(
              isSpeaking
                  ? Icons.record_voice_over_rounded
                  : Icons.auto_awesome,
              color: Colors.white,
              size: 30,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'AI 어시스턴트',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 18,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  _statusLabel(mode),
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.85),
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
          // 연결 상태 점
          Container(
            width: 10,
            height: 10,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: mode == InviteMode.connecting
                  ? Colors.orangeAccent
                  : Colors.greenAccent,
            ),
          ),
        ],
      ),
    );
  }

  String _statusLabel(InviteMode mode) => switch (mode) {
        InviteMode.connecting => '연결 중...',
        InviteMode.aiSpeaking => 'AI가 말하는 중...',
        InviteMode.myTurn => '지금 말씀하세요',
        InviteMode.processing => 'AI가 생각 중...',
        InviteMode.error => '연결 오류',
        InviteMode.videoPlaying => '특별한 영상 재생 중...',
      };
}

// ── 대화 메시지 영역 ─────────────────────────────────────────────────────────

class _MessageArea extends StatelessWidget {
  final String aiMessage;
  final String myMessage;
  final InviteMode mode;

  const _MessageArea({
    required this.aiMessage,
    required this.myMessage,
    required this.mode,
  });

  @override
  Widget build(BuildContext context) {
    if (mode == InviteMode.connecting) {
      return const Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircularProgressIndicator(color: Color(0xFF6C63FF)),
            SizedBox(height: 20),
            Text(
              'AI와 연결 중입니다...',
              style: TextStyle(color: Colors.grey, fontSize: 15),
            ),
          ],
        ),
      );
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 8),
      children: [
        if (aiMessage.isNotEmpty)
          _ChatBubble(
            text: aiMessage,
            isAi: true,
            isActive: mode == InviteMode.aiSpeaking,
          ),
        if (myMessage.isNotEmpty) ...[
          const SizedBox(height: 10),
          _ChatBubble(
            text: myMessage,
            isAi: false,
            isActive: mode == InviteMode.processing,
          ),
        ],
        if (mode == InviteMode.processing) ...[
          const SizedBox(height: 10),
          const _TypingBubble(),
        ],
      ],
    );
  }
}

class _ChatBubble extends StatelessWidget {
  final String text;
  final bool isAi;
  final bool isActive;

  const _ChatBubble({
    required this.text,
    required this.isAi,
    this.isActive = false,
  });

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: isAi ? Alignment.centerLeft : Alignment.centerRight,
      child: Container(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.78,
        ),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
        decoration: BoxDecoration(
          color: isAi
              ? (isActive
                  ? const Color(0xFF6C63FF)
                  : const Color(0xFF7B72FF))
              : Colors.white,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(18),
            topRight: const Radius.circular(18),
            bottomLeft:
                isAi ? Radius.zero : const Radius.circular(18),
            bottomRight:
                isAi ? const Radius.circular(18) : Radius.zero,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.07),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Text(
          text,
          style: TextStyle(
            color: isAi ? Colors.white : const Color(0xFF222222),
            fontSize: 15,
            height: 1.55,
          ),
        ),
      ),
    );
  }
}

class _TypingBubble extends StatefulWidget {
  const _TypingBubble();

  @override
  State<_TypingBubble> createState() => _TypingBubbleState();
}

class _TypingBubbleState extends State<_TypingBubble>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
        decoration: BoxDecoration(
          color: const Color(0xFF7B72FF).withValues(alpha: 0.75),
          borderRadius: const BorderRadius.only(
            topLeft: Radius.circular(18),
            topRight: Radius.circular(18),
            bottomRight: Radius.circular(18),
          ),
        ),
        child: AnimatedBuilder(
          animation: _ctrl,
          builder: (_, __) {
            return Row(
              mainAxisSize: MainAxisSize.min,
              children: List.generate(3, (i) {
                final phase = (_ctrl.value + i / 3) % 1.0;
                final t = (phase < 0.5 ? phase * 2 : (1 - phase) * 2);
                return Container(
                  margin: const EdgeInsets.symmetric(horizontal: 3),
                  child: Transform.translate(
                    offset: Offset(0, -6 * t),
                    child: Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                      ),
                    ),
                  ),
                );
              }),
            );
          },
        ),
      ),
    );
  }
}

// ── 마이크 버튼 섹션 ──────────────────────────────────────────────────────────

class _MicSection extends StatelessWidget {
  final bool isMyTurn;
  final bool isListening;
  final bool isProcessing;
  final AnimationController pulseCtrl;
  final VoidCallback onPressStart;
  final VoidCallback onPressEnd;

  const _MicSection({
    required this.isMyTurn,
    required this.isListening,
    required this.isProcessing,
    required this.pulseCtrl,
    required this.onPressStart,
    required this.onPressEnd,
  });

  @override
  Widget build(BuildContext context) {
    final canTalk = isMyTurn && !isProcessing;

    return Container(
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 36),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.07),
            blurRadius: 20,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // 안내 텍스트
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 250),
            child: Text(
              key: ValueKey(isListening ? 'l' : isProcessing ? 'p' : canTalk ? 't' : 'w'),
              isListening
                  ? '듣고 있습니다... 손을 떼면 전송됩니다'
                  : isProcessing
                      ? 'AI가 답변을 생각 중입니다...'
                      : canTalk
                          ? '버튼을 누르고 말씀하세요'
                          : 'AI가 말하는 중입니다...',
              style: TextStyle(
                color: Colors.grey[600],
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          const SizedBox(height: 22),

          // 마이크 버튼 (Listener로 raw pointer 감지)
          AnimatedBuilder(
            animation: pulseCtrl,
            builder: (_, child) {
              final scale = isListening ? 1.0 + 0.07 * pulseCtrl.value : 1.0;
              return Transform.scale(scale: scale, child: child);
            },
            child: Listener(
              onPointerDown: canTalk ? (_) => onPressStart() : null,
              onPointerUp: isListening ? (_) => onPressEnd() : null,
              onPointerCancel: isListening ? (_) => onPressEnd() : null,
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                width: 90,
                height: 90,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: isListening
                      ? const Color(0xFFE91E8C)
                      : canTalk
                          ? const Color(0xFF6C63FF)
                          : Colors.grey[300],
                  boxShadow: canTalk || isListening
                      ? [
                          BoxShadow(
                            color: (isListening
                                    ? const Color(0xFFE91E8C)
                                    : const Color(0xFF6C63FF))
                                .withValues(alpha: 0.4),
                            blurRadius: 22,
                            spreadRadius: 4,
                          ),
                        ]
                      : null,
                ),
                child: Icon(
                  isListening ? Icons.mic_rounded : Icons.mic_none_rounded,
                  color: Colors.white,
                  size: 44,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── 텍스트 입력 섹션 (STT 불가 시 / 로컬 테스트 모드) ──────────────────────

class _TextInputSection extends StatelessWidget {
  final bool isMyTurn;
  final bool isProcessing;
  final TextEditingController controller;
  final VoidCallback onSubmit;

  const _TextInputSection({
    required this.isMyTurn,
    required this.isProcessing,
    required this.controller,
    required this.onSubmit,
  });

  @override
  Widget build(BuildContext context) {
    final canType = isMyTurn && !isProcessing;

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 32),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.07),
            blurRadius: 20,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // 안내 텍스트
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 250),
            child: Text(
              key: ValueKey(canType ? 'on' : isProcessing ? 'proc' : 'wait'),
              canType
                  ? '답변을 입력하고 전송하세요'
                  : isProcessing
                      ? 'AI가 답변을 생각 중입니다...'
                      : 'AI가 말하는 중입니다...',
              style: TextStyle(
                color: Colors.grey[600],
                fontSize: 13,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          const SizedBox(height: 12),
          // 텍스트 입력 행
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: controller,
                  enabled: canType,
                  onSubmitted: canType ? (_) => onSubmit() : null,
                  decoration: InputDecoration(
                    hintText: canType ? '여기에 입력하세요...' : '대기 중...',
                    hintStyle: TextStyle(color: Colors.grey[400]),
                    filled: true,
                    fillColor: canType
                        ? const Color(0xFFF3F0FF)
                        : Colors.grey[100],
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 18,
                      vertical: 14,
                    ),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(24),
                      borderSide: BorderSide.none,
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(24),
                      borderSide: const BorderSide(
                        color: Color(0xFF6C63FF),
                        width: 1.5,
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              // 전송 버튼
              AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: canType
                      ? const Color(0xFF6C63FF)
                      : Colors.grey[300],
                  boxShadow: canType
                      ? [
                          BoxShadow(
                            color: const Color(0xFF6C63FF)
                                .withValues(alpha: 0.35),
                            blurRadius: 14,
                            spreadRadius: 2,
                          ),
                        ]
                      : null,
                ),
                child: IconButton(
                  icon: Icon(
                    Icons.send_rounded,
                    color: canType ? Colors.white : Colors.grey[500],
                    size: 22,
                  ),
                  onPressed: canType ? onSubmit : null,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

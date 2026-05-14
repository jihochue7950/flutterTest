import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:video_player/video_player.dart';

import '../providers/avatar_provider.dart';
import '../../cast/screens/local_video_player_screen.dart';

/// TV에 표시되는 AI 아바타 전체화면
/// 경로: /session/:sessionId/avatar
class AiAvatarScreen extends ConsumerStatefulWidget {
  final String sessionId;

  const AiAvatarScreen({super.key, required this.sessionId});

  @override
  ConsumerState<AiAvatarScreen> createState() => _AiAvatarScreenState();
}

class _AiAvatarScreenState extends ConsumerState<AiAvatarScreen>
    with TickerProviderStateMixin {
  late AnimationController _pulseCtrl;
  late AnimationController _breathCtrl;
  late AnimationController _listenCtrl;

  /// 영상 선 초기화 컨트롤러 — videoPlayRequested 수신 시 즉시 재생 가능하도록
  VideoPlayerController? _preloadedController;

  @override
  void initState() {
    super.initState();
    _pulseCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat();

    _breathCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2500),
    )..repeat(reverse: true);

    _listenCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat();

    // 대화가 진행되는 동안 영상 컨트롤러를 백그라운드에서 미리 초기화
    _preloadVideo();
  }

  /// 기본 영상을 백그라운드에서 선 초기화. 실패해도 무시하고 나중에 일반 초기화로 폴백.
  Future<void> _preloadVideo() async {
    final ctrl = VideoPlayerController.asset('assets/video/proposal.mp4');
    try {
      await ctrl.initialize();
      ctrl.setLooping(false);
      if (mounted) {
        _preloadedController = ctrl;
      } else {
        ctrl.dispose();
      }
    } catch (_) {
      ctrl.dispose();
    }
  }

  @override
  void dispose() {
    _pulseCtrl.dispose();
    _breathCtrl.dispose();
    _listenCtrl.dispose();
    // LocalVideoPlayerScreen에 넘겨주지 못한 경우에만 여기서 dispose
    _preloadedController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final avatar = ref.watch(avatarProvider(widget.sessionId));
    final isSpeaking =
        avatar.mode == AvatarMode.speaking || avatar.mode == AvatarMode.intro;
    final isListening = avatar.mode == AvatarMode.listening;

    // shouldPlayVideo → 즉시 영상 화면 push
    // 영상 자연 종료 → LocalVideoPlayerScreen이 afterScreen으로 축하 화면을 페이드 전환
    ref.listen<AvatarState>(
      avatarProvider(widget.sessionId),
      (prev, next) {
        if (prev?.shouldPlayVideo == false && next.shouldPlayVideo && mounted) {
          // 선 초기화 컨트롤러 전달 (없으면 null — LocalVideoPlayerScreen이 폴백 초기화)
          final preloaded = _preloadedController;
          _preloadedController = null;

          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => LocalVideoPlayerScreen(
                videoUrl: next.videoUrl,
                preloadedController: preloaded,
                afterScreen: const _CongratsScreen(), // 영상 종료 후 페이드 전환
              ),
              fullscreenDialog: true,
            ),
          );
        }
      },
    );

    // 아직 시작 전 → "대화 시작" 버튼 전체화면 표시
    if (!avatar.hasStarted) {
      return Scaffold(
        backgroundColor: const Color(0xFF080810),
        body: Container(
          decoration: const BoxDecoration(
            gradient: RadialGradient(
              center: Alignment.center,
              radius: 1.2,
              colors: [Color(0xFF1A1A3E), Color(0xFF050508)],
            ),
          ),
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 130,
                  height: 130,
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [Color(0xFF6C63FF), Color(0xFF3F51B5)],
                    ),
                  ),
                  child: const Icon(
                    Icons.auto_awesome,
                    color: Colors.white,
                    size: 60,
                  ),
                ),
                const SizedBox(height: 36),
                const Text(
                  'AI 어시스턴트',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 26,
                    fontWeight: FontWeight.w300,
                    letterSpacing: 1,
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  avatar.isConnected ? '서버 연결됨 · 준비 완료' : '서버 연결 중...',
                  style: TextStyle(
                    color: avatar.isConnected
                        ? Colors.greenAccent
                        : Colors.white38,
                    fontSize: 13,
                  ),
                ),
                const SizedBox(height: 48),
                ElevatedButton.icon(
                  onPressed: () => ref
                      .read(avatarProvider(widget.sessionId).notifier)
                      .startIntro(),
                  icon: const Icon(Icons.play_arrow_rounded, size: 26),
                  label: const Text(
                    '대화 시작',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFE91E8C),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(
                        horizontal: 40, vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(32),
                    ),
                    elevation: 8,
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFF080810),
      body: Stack(
        children: [
          // 방사형 그라디언트 배경
          Container(
            decoration: const BoxDecoration(
              gradient: RadialGradient(
                center: Alignment.center,
                radius: 1.2,
                colors: [Color(0xFF1A1A3E), Color(0xFF050508)],
              ),
            ),
          ),

          // 중앙 콘텐츠
          Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // 아바타 원형 + 애니메이션
                SizedBox(
                  width: 300,
                  height: 300,
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      // 말할 때: 확장 링
                      if (isSpeaking)
                        AnimatedBuilder(
                          animation: _pulseCtrl,
                          builder: (_, __) => CustomPaint(
                            size: const Size(300, 300),
                            painter: _ExpandingRingsPainter(
                              progress: _pulseCtrl.value,
                              color: const Color(0xFFE91E8C),
                            ),
                          ),
                        ),

                      // 대기/연결 중: 숨쉬기 글로우
                      if (!isSpeaking)
                        AnimatedBuilder(
                          animation: _breathCtrl,
                          builder: (_, __) {
                            final glow = _breathCtrl.value;
                            return Container(
                              width: 185 + 15 * glow,
                              height: 185 + 15 * glow,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                boxShadow: [
                                  BoxShadow(
                                    color: const Color(0xFF6C63FF)
                                        .withValues(alpha:0.15 + 0.2 * glow),
                                    blurRadius: 50,
                                    spreadRadius: 10,
                                  ),
                                ],
                              ),
                            );
                          },
                        ),

                      // 메인 아바타 원형
                      AnimatedContainer(
                        duration: const Duration(milliseconds: 400),
                        width: 170,
                        height: 170,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: isSpeaking
                                ? const [
                                    Color(0xFFE91E8C),
                                    Color(0xFF9C27B0),
                                  ]
                                : isListening
                                    ? const [
                                        Color(0xFF00BCD4),
                                        Color(0xFF0097A7),
                                      ]
                                    : const [
                                        Color(0xFF6C63FF),
                                        Color(0xFF3F51B5),
                                      ],
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: (isSpeaking
                                      ? const Color(0xFFE91E8C)
                                      : isListening
                                          ? const Color(0xFF00BCD4)
                                          : const Color(0xFF6C63FF))
                                  .withValues(alpha:0.45),
                              blurRadius: 35,
                              spreadRadius: 5,
                            ),
                          ],
                        ),
                        child: Icon(
                          isSpeaking
                              ? Icons.record_voice_over_rounded
                              : isListening
                                  ? Icons.hearing_rounded
                                  : Icons.auto_awesome,
                          color: Colors.white,
                          size: 78,
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 20),

                // 듣는 중: 바운싱 점
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 300),
                  child: isListening
                      ? Padding(
                          key: const ValueKey('dots'),
                          padding: const EdgeInsets.only(bottom: 12),
                          child: _BouncingDots(controller: _listenCtrl),
                        )
                      : const SizedBox(key: ValueKey('nodots'), height: 12),
                ),

                // 대사 텍스트 버블
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 450),
                  transitionBuilder: (child, anim) => FadeTransition(
                    opacity: anim,
                    child: SlideTransition(
                      position: Tween<Offset>(
                        begin: const Offset(0, 0.08),
                        end: Offset.zero,
                      ).animate(CurvedAnimation(
                          parent: anim, curve: Curves.easeOut)),
                      child: child,
                    ),
                  ),
                  child: Container(
                    key: ValueKey(avatar.displayText),
                    constraints: const BoxConstraints(maxWidth: 620),
                    margin: const EdgeInsets.symmetric(horizontal: 32),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 32, vertical: 18),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha:0.07),
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(
                        color: Colors.white.withValues(alpha:0.12),
                        width: 1,
                      ),
                    ),
                    child: Text(
                      avatar.displayText.isEmpty
                          ? '연결 중...'
                          : avatar.displayText,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 22,
                        fontWeight: FontWeight.w300,
                        height: 1.65,
                        letterSpacing: 0.3,
                      ),
                    ),
                  ),
                ),

                const SizedBox(height: 28),

                // 모드 뱃지
                _ModeBadge(mode: avatar.mode),
              ],
            ),
          ),

          // 우상단 WS 연결 상태
          Positioned(
            top: 24,
            right: 24,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: avatar.isConnected
                        ? Colors.greenAccent
                        : Colors.redAccent,
                  ),
                ),
                const SizedBox(width: 6),
                Text(
                  avatar.isConnected ? 'LIVE' : 'OFFLINE',
                  style: TextStyle(
                    color: avatar.isConnected
                        ? Colors.greenAccent
                        : Colors.redAccent,
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1.8,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── 말할 때 확장되는 링 ─────────────────────────────────────────────────────

class _ExpandingRingsPainter extends CustomPainter {
  final double progress; // 0.0 → 1.0 (repeat)
  final Color color;

  const _ExpandingRingsPainter({
    required this.progress,
    required this.color,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    const baseR = 85.0;
    const maxR = 148.0;

    for (int i = 0; i < 3; i++) {
      final phase = (progress + i / 3) % 1.0;
      final radius = baseR + (maxR - baseR) * phase;
      final opacity = (1.0 - phase) * 0.55;

      canvas.drawCircle(
        center,
        radius,
        Paint()
          ..color = color.withValues(alpha:opacity)
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2.5,
      );
    }
  }

  @override
  bool shouldRepaint(_ExpandingRingsPainter old) =>
      old.progress != progress;
}

// ── 듣는 중 바운싱 점 세 개 ────────────────────────────────────────────────

class _BouncingDots extends StatelessWidget {
  final AnimationController controller;

  const _BouncingDots({required this.controller});

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: controller,
      builder: (_, __) {
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: List.generate(3, (i) {
            final phase = (controller.value + i / 3) % 1.0;
            final bounce = math.sin(phase * math.pi);
            return Container(
              margin: const EdgeInsets.symmetric(horizontal: 5),
              child: Transform.translate(
                offset: Offset(0, -12 * bounce),
                child: Container(
                  width: 11,
                  height: 11,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.white.withValues(alpha:0.5 + 0.5 * bounce),
                  ),
                ),
              ),
            );
          }),
        );
      },
    );
  }
}

// ── 현재 모드 뱃지 ────────────────────────────────────────────────────────

class _ModeBadge extends StatelessWidget {
  final AvatarMode mode;

  const _ModeBadge({required this.mode});

  @override
  Widget build(BuildContext context) {
    final (label, icon, color) = switch (mode) {
      AvatarMode.intro => (
          '자기소개 중',
          Icons.record_voice_over_rounded,
          const Color(0xFF9C27B0)
        ),
      AvatarMode.speaking => (
          'AI 응답 중',
          Icons.volume_up_rounded,
          const Color(0xFFE91E8C)
        ),
      AvatarMode.listening => (
          '대화 대기 중',
          Icons.hearing_rounded,
          const Color(0xFF00BCD4)
        ),
      AvatarMode.idle => (
          '연결 대기 중',
          Icons.wifi_find_rounded,
          Colors.grey
        ),
    };

    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 300),
      child: Container(
        key: ValueKey(mode),
        padding:
            const EdgeInsets.symmetric(horizontal: 18, vertical: 9),
        decoration: BoxDecoration(
          color: color.withValues(alpha:0.15),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: color.withValues(alpha:0.35), width: 1),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: color, size: 16),
            const SizedBox(width: 7),
            Text(
              label,
              style: TextStyle(
                color: color,
                fontSize: 13,
                fontWeight: FontWeight.w600,
                letterSpacing: 0.5,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── 영상 종료 후 축하 화면 (TV 전체화면) ────────────────────────────────────

class _CongratsScreen extends StatefulWidget {
  const _CongratsScreen();

  @override
  State<_CongratsScreen> createState() => _CongratsScreenState();
}

class _CongratsScreenState extends State<_CongratsScreen>
    with TickerProviderStateMixin {
  late AnimationController _fadeCtrl;
  late AnimationController _heartCtrl;
  late AnimationController _floatCtrl;
  late Animation<double> _fadeAnim;
  late Animation<double> _floatAnim;

  @override
  void initState() {
    super.initState();
    _fadeCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1800),
    );
    _heartCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    )..repeat(reverse: true);
    _floatCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 3000),
    )..repeat(reverse: true);

    _fadeAnim = CurvedAnimation(parent: _fadeCtrl, curve: Curves.easeIn);
    _floatAnim = CurvedAnimation(parent: _floatCtrl, curve: Curves.easeInOut);
    _fadeCtrl.forward();
  }

  @override
  void dispose() {
    _fadeCtrl.dispose();
    _heartCtrl.dispose();
    _floatCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: FadeTransition(
        opacity: _fadeAnim,
        child: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xFF1A0030), Color(0xFF3D0060), Color(0xFF700040)],
            ),
          ),
          child: Stack(
            children: [
              // 배경 빛 효과
              Center(
                child: AnimatedBuilder(
                  animation: _floatAnim,
                  builder: (_, __) => Container(
                    width: 400 + 40 * _floatAnim.value,
                    height: 400 + 40 * _floatAnim.value,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFFE91E8C).withValues(
                              alpha: 0.12 + 0.08 * _floatAnim.value),
                          blurRadius: 120,
                          spreadRadius: 40,
                        ),
                      ],
                    ),
                  ),
                ),
              ),

              // 중앙 콘텐츠
              Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // 박동하는 반지
                    AnimatedBuilder(
                      animation: _heartCtrl,
                      builder: (_, __) => Transform.scale(
                        scale: 1.0 + 0.12 * _heartCtrl.value,
                        child: const Text('💍', style: TextStyle(fontSize: 96)),
                      ),
                    ),
                    const SizedBox(height: 32),

                    // 메인 타이틀
                    const Text(
                      '결혼을 축하합니다!',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 42,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 2,
                      ),
                    ),
                    const SizedBox(height: 20),

                    // 서브 멘트 (부드럽게 떠오름)
                    AnimatedBuilder(
                      animation: _floatAnim,
                      builder: (_, child) => Transform.translate(
                        offset: Offset(0, -8 * _floatAnim.value),
                        child: child,
                      ),
                      child: Container(
                        constraints: const BoxConstraints(maxWidth: 560),
                        child: const Text(
                          '두 분의 새로운 시작을 진심으로 축하드립니다.\n앞으로 행복한 날들이 가득하시길 바랍니다.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: Colors.white70,
                            fontSize: 20,
                            fontWeight: FontWeight.w300,
                            height: 1.75,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 40),

                    const Text(
                      '🌸   🤍   🌸',
                      style: TextStyle(fontSize: 36, letterSpacing: 12),
                    ),
                    const SizedBox(height: 48),

                    Container(
                      width: 200,
                      height: 1,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [
                            Colors.transparent,
                            Colors.white.withValues(alpha: 0.4),
                            Colors.transparent,
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                    Text(
                      '🥂  Congratulations  🥂',
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.5),
                        fontSize: 15,
                        letterSpacing: 3,
                        fontWeight: FontWeight.w300,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

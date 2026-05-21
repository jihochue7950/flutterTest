import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:video_player/video_player.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../providers/avatar_provider.dart';
import '../../cast/screens/local_video_player_screen.dart';

// ── Bunny 3D WebView 위젯 ────────────────────────────────────────────────────

class _KittyWebView extends StatefulWidget {
  final AvatarMode mode;
  const _KittyWebView({required this.mode});

  @override
  State<_KittyWebView> createState() => _KittyWebViewState();
}

class _KittyWebViewState extends State<_KittyWebView> {
  late final WebViewController _ctrl;
  bool _ready = false;

  @override
  void initState() {
    super.initState();
    _ctrl = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.transparent)
      ..setNavigationDelegate(NavigationDelegate(
        onPageFinished: (_) {
          _ready = true;
          _ctrl.runJavaScript(
              "if(window.setKittyState) setKittyState('entering');");
        },
      ))
      ..loadFlutterAsset('assets/html/bunny_avatar.html');
  }

  @override
  void didUpdateWidget(_KittyWebView old) {
    super.didUpdateWidget(old);
    if (old.mode != widget.mode && _ready) _sync(widget.mode);
  }

  void _sync(AvatarMode mode) {
    final s = switch (mode) {
      AvatarMode.intro     => 'speaking',
      AvatarMode.speaking  => 'speaking',
      AvatarMode.listening => 'listening',
      AvatarMode.idle      => 'idle',
    };
    _ctrl.runJavaScript("if(window.setKittyState) setKittyState('$s');");
  }

  @override
  Widget build(BuildContext context) => WebViewWidget(controller: _ctrl);
}


// ── TV 전체화면 AI 아바타 화면 ─────────────────────────────────────────────

class AiAvatarScreen extends ConsumerStatefulWidget {
  final String sessionId;
  const AiAvatarScreen({super.key, required this.sessionId});

  @override
  ConsumerState<AiAvatarScreen> createState() => _AiAvatarScreenState();
}

class _AiAvatarScreenState extends ConsumerState<AiAvatarScreen> {
  VideoPlayerController? _preloadedController;

  @override
  void initState() {
    super.initState();
    _preloadVideo();
  }

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
    _preloadedController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final avatar = ref.watch(avatarProvider(widget.sessionId));

    ref.listen<AvatarState>(avatarProvider(widget.sessionId), (prev, next) {
      if (prev?.shouldPlayVideo == false && next.shouldPlayVideo && mounted) {
        final preloaded = _preloadedController;
        _preloadedController = null;
        Navigator.of(context).push(MaterialPageRoute(
          builder: (_) => LocalVideoPlayerScreen(
            videoUrl: next.videoUrl,
            preloadedController: preloaded,
            afterScreen: const _CongratsScreen(),
          ),
          fullscreenDialog: true,
        ));
      }
    });

    // 시작 전: "대화 시작" 버튼 화면
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
                const Text('Bunny AI',
                    style: TextStyle(color: Colors.white38, fontSize: 14,
                        letterSpacing: 2)),
                const SizedBox(height: 40),
                Text(
                  avatar.isConnected ? '서버 연결됨 · 준비 완료' : '서버 연결 중...',
                  style: TextStyle(
                    color: avatar.isConnected ? Colors.greenAccent : Colors.white38,
                    fontSize: 13),
                ),
                const SizedBox(height: 48),
                ElevatedButton.icon(
                  onPressed: () =>
                      ref.read(avatarProvider(widget.sessionId).notifier).startIntro(),
                  icon: const Icon(Icons.play_arrow_rounded, size: 26),
                  label: const Text('대화 시작',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFE91E8C),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 16),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(32)),
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
          // 3D Hello Kitty (전체화면 WebView)
          Positioned.fill(
            child: _KittyWebView(mode: avatar.mode),
          ),

          // 우상단 연결 상태
          Positioned(
            top: 24, right: 24,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 8, height: 8,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: avatar.isConnected ? Colors.greenAccent : Colors.redAccent,
                  ),
                ),
                const SizedBox(width: 6),
                Text(
                  avatar.isConnected ? 'LIVE' : 'OFFLINE',
                  style: TextStyle(
                    color: avatar.isConnected ? Colors.greenAccent : Colors.redAccent,
                    fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1.8,
                  ),
                ),
              ],
            ),
          ),

          // 하단 대사 텍스트 버블
          Positioned(
            left: 32, right: 32, bottom: 80,
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 400),
              child: avatar.displayText.isEmpty
                  ? const SizedBox.shrink()
                  : Container(
                      key: ValueKey(avatar.displayText),
                      padding: const EdgeInsets.symmetric(
                          horizontal: 28, vertical: 16),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                            color: Colors.white.withValues(alpha: 0.12)),
                      ),
                      child: Text(
                        avatar.displayText,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          color: Colors.white, fontSize: 20,
                          fontWeight: FontWeight.w300, height: 1.6,
                        ),
                      ),
                    ),
            ),
          ),

          // 하단 모드 뱃지
          Positioned(
            bottom: 28, left: 0, right: 0,
            child: Center(child: _ModeBadge(mode: avatar.mode)),
          ),
        ],
      ),
    );
  }
}

// ── 모드 뱃지 ────────────────────────────────────────────────────────────────

class _ModeBadge extends StatelessWidget {
  final AvatarMode mode;
  const _ModeBadge({required this.mode});

  @override
  Widget build(BuildContext context) {
    final (label, color) = switch (mode) {
      AvatarMode.intro     => ('자기소개 중', const Color(0xFF9C27B0)),
      AvatarMode.speaking  => ('AI 응답 중', const Color(0xFFE91E8C)),
      AvatarMode.listening => ('대화 대기 중', const Color(0xFF00BCD4)),
      AvatarMode.idle      => ('연결 대기 중', Colors.grey),
    };
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 300),
      child: Container(
        key: ValueKey(mode),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: color.withValues(alpha: 0.35)),
        ),
        child: Text(label,
            style: TextStyle(color: color, fontSize: 12,
                fontWeight: FontWeight.w600, letterSpacing: 0.5)),
      ),
    );
  }
}

// ── 영상 종료 후 축하 화면 ────────────────────────────────────────────────────

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
    _fadeCtrl  = AnimationController(vsync:this, duration:const Duration(milliseconds:1800));
    _heartCtrl = AnimationController(vsync:this, duration:const Duration(milliseconds:800))..repeat(reverse:true);
    _floatCtrl = AnimationController(vsync:this, duration:const Duration(milliseconds:3000))..repeat(reverse:true);
    _fadeAnim  = CurvedAnimation(parent:_fadeCtrl, curve:Curves.easeIn);
    _floatAnim = CurvedAnimation(parent:_floatCtrl, curve:Curves.easeInOut);
    _fadeCtrl.forward();
  }

  @override
  void dispose() {
    _fadeCtrl.dispose(); _heartCtrl.dispose(); _floatCtrl.dispose();
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
              begin: Alignment.topLeft, end: Alignment.bottomRight,
              colors: [Color(0xFF1A0030), Color(0xFF3D0060), Color(0xFF700040)],
            ),
          ),
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                AnimatedBuilder(
                  animation: _heartCtrl,
                  builder: (_, __) => Transform.scale(
                    scale: 1.0 + 0.12 * _heartCtrl.value,
                    child: const Text('💍', style: TextStyle(fontSize: 96)),
                  ),
                ),
                const SizedBox(height: 32),
                const Text('결혼을 축하합니다!',
                    style: TextStyle(color: Colors.white, fontSize: 42,
                        fontWeight: FontWeight.w700, letterSpacing: 2)),
                const SizedBox(height: 20),
                AnimatedBuilder(
                  animation: _floatAnim,
                  builder: (_, child) => Transform.translate(
                    offset: Offset(0, -8 * _floatAnim.value), child: child),
                  child: Container(
                    constraints: const BoxConstraints(maxWidth: 560),
                    child: const Text(
                      '두 분의 새로운 시작을 진심으로 축하드립니다.\n앞으로 행복한 날들이 가득하시길 바랍니다.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.white70, fontSize: 20,
                          fontWeight: FontWeight.w300, height: 1.75),
                    ),
                  ),
                ),
                const SizedBox(height: 40),
                const Text('🌸   🤍   🌸',
                    style: TextStyle(fontSize: 36, letterSpacing: 12)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

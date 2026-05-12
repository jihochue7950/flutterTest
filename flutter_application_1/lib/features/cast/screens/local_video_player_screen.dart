import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:video_player/video_player.dart';

/// AI 트리거로 재생되는 영상 화면.
/// - videoUrl이 "assets/"로 시작 → 로컬 번들 에셋 재생
/// - 그 외 → 네트워크 URL 재생 (실제 운영 / CDN)
class LocalVideoPlayerScreen extends StatefulWidget {
  final String videoUrl;

  const LocalVideoPlayerScreen({super.key, required this.videoUrl});

  @override
  State<LocalVideoPlayerScreen> createState() => _LocalVideoPlayerScreenState();
}

class _LocalVideoPlayerScreenState extends State<LocalVideoPlayerScreen> {
  late VideoPlayerController _controller;
  bool _initialized = false;
  String? _error;

  bool get _isAsset => widget.videoUrl.startsWith('assets/');

  @override
  void initState() {
    super.initState();
    // 가로 고정
    SystemChrome.setPreferredOrientations([
      DeviceOrientation.landscapeLeft,
      DeviceOrientation.landscapeRight,
    ]);
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    _initPlayer();
  }

  Future<void> _initPlayer() async {
    try {
      _controller = _isAsset
          ? VideoPlayerController.asset(widget.videoUrl)
          : VideoPlayerController.networkUrl(Uri.parse(widget.videoUrl));

      await _controller.initialize();
      _controller.setLooping(false);
      await _controller.play();
      if (mounted) setState(() => _initialized = true);

      // 재생 완료 시 화면 종료
      _controller.addListener(() {
        if (_controller.value.position >= _controller.value.duration &&
            _controller.value.duration > Duration.zero &&
            mounted) {
          _exit();
        }
      });
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }
  }

  void _exit() {
    SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    if (mounted) Navigator.of(context).pop();
  }

  @override
  void dispose() {
    _controller.dispose();
    SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: GestureDetector(
        onTap: _togglePlayPause,
        child: Stack(
          fit: StackFit.expand,
          children: [
            // ── 영상 ──────────────────────────────────
            if (_initialized)
              Center(
                child: AspectRatio(
                  aspectRatio: _controller.value.aspectRatio,
                  child: VideoPlayer(_controller),
                ),
              )
            else if (_error != null)
              _ErrorView(error: _error!, onRetry: _initPlayer)
            else
              const Center(
                child: CircularProgressIndicator(color: Colors.white54),
              ),

            // ── 닫기 버튼 ─────────────────────────────
            Positioned(
              top: 20,
              right: 20,
              child: SafeArea(
                child: IconButton(
                  icon: const Icon(Icons.close, color: Colors.white70, size: 28),
                  onPressed: _exit,
                ),
              ),
            ),

            // ── 재생/일시정지 오버레이 ─────────────────
            if (_initialized)
              _PlayPauseOverlay(controller: _controller),
          ],
        ),
      ),
    );
  }

  void _togglePlayPause() {
    if (!_initialized) return;
    setState(() {
      _controller.value.isPlaying
          ? _controller.pause()
          : _controller.play();
    });
  }
}

class _PlayPauseOverlay extends StatefulWidget {
  final VideoPlayerController controller;
  const _PlayPauseOverlay({required this.controller});

  @override
  State<_PlayPauseOverlay> createState() => _PlayPauseOverlayState();
}

class _PlayPauseOverlayState extends State<_PlayPauseOverlay> {
  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_listener);
  }

  void _listener() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    widget.controller.removeListener(_listener);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // 하단 프로그레스 바
    return Positioned(
      bottom: 0,
      left: 0,
      right: 0,
      child: VideoProgressIndicator(
        widget.controller,
        allowScrubbing: true,
        colors: const VideoProgressColors(
          playedColor: Color(0xFFE91E8C),
          bufferedColor: Colors.white24,
          backgroundColor: Colors.white12,
        ),
        padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 8),
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  final String error;
  final VoidCallback onRetry;

  const _ErrorView({required this.error, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.error_outline, color: Colors.white54, size: 52),
          const SizedBox(height: 12),
          const Text(
            '영상을 불러올 수 없습니다',
            style: TextStyle(color: Colors.white70, fontSize: 16),
          ),
          const SizedBox(height: 6),
          Text(
            error,
            style: const TextStyle(color: Colors.white38, fontSize: 11),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 20),
          TextButton(
            onPressed: onRetry,
            child: const Text('다시 시도', style: TextStyle(color: Colors.white70)),
          ),
        ],
      ),
    );
  }
}

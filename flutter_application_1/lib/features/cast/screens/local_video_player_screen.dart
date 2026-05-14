import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:video_player/video_player.dart';

/// AI 트리거로 재생되는 영상 화면.
///
/// [preloadedController] : 외부에서 미리 initialize()한 컨트롤러.
///                         제공 시 initialize() 대기 없이 즉시 재생.
///                         이 화면이 dispose할 때 함께 dispose.
/// [afterScreen]         : 영상 자연 종료 후 pushReplacement로 보여줄 화면.
///                         null이면 단순 pop.
class LocalVideoPlayerScreen extends StatefulWidget {
  final String videoUrl;
  final VideoPlayerController? preloadedController;
  final Widget? afterScreen;

  const LocalVideoPlayerScreen({
    super.key,
    required this.videoUrl,
    this.preloadedController,
    this.afterScreen,
  });

  @override
  State<LocalVideoPlayerScreen> createState() => _LocalVideoPlayerScreenState();
}

class _LocalVideoPlayerScreenState extends State<LocalVideoPlayerScreen> {
  VideoPlayerController? _controller;
  bool _initialized = false;
  String? _error;
  bool _ended = false;

  bool get _isAsset => widget.videoUrl.startsWith('assets/');

  @override
  void initState() {
    super.initState();
    SystemChrome.setPreferredOrientations([
      DeviceOrientation.landscapeLeft,
      DeviceOrientation.landscapeRight,
    ]);
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    _initPlayer();
  }

  Future<void> _initPlayer() async {
    try {
      final preloaded = widget.preloadedController;

      if (preloaded != null && preloaded.value.isInitialized) {
        // 선 초기화 컨트롤러 → initialize() 건너뛰고 즉시 재생
        _controller = preloaded;
        _controller!.setLooping(false);
        await _controller!.play();
        if (mounted) setState(() => _initialized = true);
      } else {
        // 폴백: 일반 초기화
        _controller = _isAsset
            ? VideoPlayerController.asset(widget.videoUrl)
            : VideoPlayerController.networkUrl(Uri.parse(widget.videoUrl));
        await _controller!.initialize();
        _controller!.setLooping(false);
        await _controller!.play();
        if (mounted) setState(() => _initialized = true);
      }

      _controller!.addListener(_onVideoProgress);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }
  }

  void _onVideoProgress() {
    if (_ended || !mounted || _controller == null) return;
    if (_controller!.value.duration <= Duration.zero) return;
    if (_controller!.value.position < _controller!.value.duration) return;

    _ended = true;
    _controller!.removeListener(_onVideoProgress);
    _exitNaturally();
  }

  /// 영상 자연 종료 — afterScreen이 있으면 페이드 전환, 없으면 pop
  void _exitNaturally() {
    _restoreOrientation();
    if (widget.afterScreen != null && mounted) {
      Navigator.of(context).pushReplacement(
        PageRouteBuilder(
          pageBuilder: (_, __, ___) => widget.afterScreen!,
          transitionDuration: const Duration(milliseconds: 1000),
          transitionsBuilder: (_, animation, __, child) =>
              FadeTransition(opacity: animation, child: child),
        ),
      );
    } else {
      if (mounted) Navigator.of(context).pop();
    }
  }

  /// 닫기 버튼 → 그냥 pop
  void _exitManually() {
    _restoreOrientation();
    if (mounted) Navigator.of(context).pop();
  }

  void _restoreOrientation() {
    SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
  }

  @override
  void dispose() {
    _controller?.removeListener(_onVideoProgress);
    _controller?.dispose();
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
            if (_initialized)
              Center(
                child: AspectRatio(
                  aspectRatio: _controller!.value.aspectRatio,
                  child: VideoPlayer(_controller!),
                ),
              )
            else if (_error != null)
              _ErrorView(error: _error!, onRetry: _initPlayer)
            else
              const Center(
                child: CircularProgressIndicator(color: Colors.white54),
              ),

            Positioned(
              top: 20,
              right: 20,
              child: SafeArea(
                child: IconButton(
                  icon: const Icon(Icons.close, color: Colors.white70, size: 28),
                  onPressed: _exitManually,
                ),
              ),
            ),

            if (_initialized) _PlayPauseOverlay(controller: _controller!),
          ],
        ),
      ),
    );
  }

  void _togglePlayPause() {
    if (!_initialized || _controller == null) return;
    setState(() {
      _controller!.value.isPlaying
          ? _controller!.pause()
          : _controller!.play();
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

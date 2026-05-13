import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:video_player/video_player.dart';

/// AI 트리거로 재생되는 영상 화면.
/// - videoUrl이 "assets/"로 시작 → 로컬 번들 에셋 재생
/// - 그 외 → 네트워크 URL 재생 (실제 운영 / CDN)
///
/// [onVideoEnd] : 영상이 자연 종료됐을 때 호출되는 콜백.
///               수동으로 닫기 버튼을 눌렀을 때는 호출되지 않음.
/// [preloadedController] : 외부에서 미리 initialize()한 컨트롤러.
///                         제공되면 즉시 재생 — initialize() 대기 시간 없음.
///                         이 화면이 dispose 시 컨트롤러도 함께 dispose.
class LocalVideoPlayerScreen extends StatefulWidget {
  final String videoUrl;
  final VoidCallback? onVideoEnd;
  final VideoPlayerController? preloadedController;

  const LocalVideoPlayerScreen({
    super.key,
    required this.videoUrl,
    this.onVideoEnd,
    this.preloadedController,
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
        // 선 초기화된 컨트롤러 사용 → initialize() 생략으로 즉시 재생
        _controller = preloaded;
        _controller!.setLooping(false);
        await _controller!.play();
        if (mounted) setState(() => _initialized = true);
      } else {
        // 선 초기화 컨트롤러가 없거나 아직 준비 안 됨 → 일반 초기화
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
    if (_ended) return;
    if (!mounted) return;
    if (_controller == null) return;
    if (_controller!.value.duration <= Duration.zero) return;
    if (_controller!.value.position < _controller!.value.duration) return;

    _ended = true;
    _controller!.removeListener(_onVideoProgress);
    _exitNaturally();
  }

  /// 영상 자연 종료 → onVideoEnd 콜백 호출 후 pop
  void _exitNaturally() {
    _restoreOrientation();
    widget.onVideoEnd?.call();
    if (mounted) Navigator.of(context).pop();
  }

  /// 닫기 버튼 → 그냥 pop (onVideoEnd 호출 안 함)
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
    // _initPlayer가 완료되기 전에 dispose 될 수도 있으므로 ?. 사용
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
            // _initialized == true 이면 _controller는 반드시 non-null
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

            // _initialized == true 이면 _controller는 반드시 non-null
            if (_initialized) _PlayPauseOverlay(controller: _controller!),
          ],
        ),
      ),
    );
  }

  void _togglePlayPause() {
    // _initialized 체크 이후이므로 _controller는 non-null
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

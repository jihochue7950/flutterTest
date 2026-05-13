import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

import '../../../core/config/app_config.dart';
import '../../../core/models/event_model.dart';

enum AvatarMode { idle, intro, speaking, listening }

const String _kDefaultVideoUrl = 'assets/video/proposal.mp4';

class AvatarState {
  final AvatarMode mode;
  final String displayText;
  final bool isConnected;

  /// 영상 재생 트리거 — true가 되는 즉시 ai_avatar_screen이 영상 화면을 push
  final bool shouldPlayVideo;

  /// 재생할 영상 URL
  final String videoUrl;

  /// 이중 트리거 방지
  final bool videoTriggered;

  /// 사용자가 "대화 시작" 버튼을 눌렀는지 (브라우저 자동재생 정책 대응)
  final bool hasStarted;

  const AvatarState({
    this.mode = AvatarMode.idle,
    this.displayText = '',
    this.isConnected = false,
    this.shouldPlayVideo = false,
    this.videoUrl = _kDefaultVideoUrl,
    this.videoTriggered = false,
    this.hasStarted = false,
  });

  AvatarState copyWith({
    AvatarMode? mode,
    String? displayText,
    bool? isConnected,
    bool? shouldPlayVideo,
    String? videoUrl,
    bool? videoTriggered,
    bool? hasStarted,
  }) =>
      AvatarState(
        mode: mode ?? this.mode,
        displayText: displayText ?? this.displayText,
        isConnected: isConnected ?? this.isConnected,
        shouldPlayVideo: shouldPlayVideo ?? this.shouldPlayVideo,
        videoUrl: videoUrl ?? this.videoUrl,
        videoTriggered: videoTriggered ?? this.videoTriggered,
        hasStarted: hasStarted ?? this.hasStarted,
      );
}

class AvatarNotifier extends StateNotifier<AvatarState> {
  final String _sessionId;
  final FlutterTts _tts = FlutterTts();
  WebSocketChannel? _channel;
  StreamSubscription? _wsSub;
  bool _disposed = false;

  AvatarNotifier(this._sessionId) : super(const AvatarState()) {
    _init();
  }

  Future<void> _init() async {
    await _setupTts();
    _connectWs();
  }

  Future<void> _setupTts() async {
    try {
      await _tts.setLanguage('ko-KR');
      await _tts.setSpeechRate(0.85);
      await _tts.setVolume(1.0);
      await _tts.setPitch(1.05);

      _tts.setStartHandler(() {
        if (!_disposed && mounted) state = state.copyWith(mode: AvatarMode.speaking);
      });

      _tts.setCompletionHandler(() {
        if (_disposed || !mounted) return;
        // videoTriggered면 이미 영상 화면으로 이동 중 — aiListening 전송 불필요
        if (state.videoTriggered) return;
        state = state.copyWith(mode: AvatarMode.listening, displayText: '말씀하세요...');
        _sendWsEvent({'type': 'aiListening', 'sessionId': _sessionId, 'data': {}});
      });

      _tts.setCancelHandler(() {
        if (!_disposed && mounted && !state.videoTriggered) {
          state = state.copyWith(mode: AvatarMode.idle);
        }
      });

      _tts.setErrorHandler((msg) {
        // stop() 호출로 인한 interrupted는 의도적 중단 — 무시
        if (msg.toString().contains('interrupted')) return;
        debugPrint('[AvatarProvider] TTS 오류: $msg');
      });
    } catch (e) {
      debugPrint('[AvatarProvider] TTS 초기화 실패: $e');
    }
  }

  void _connectWs() {
    try {
      final uri = Uri.parse('${AppConfig.wsUrl}/sessions/$_sessionId/ws');
      _channel = WebSocketChannel.connect(uri);
      if (!_disposed && mounted) state = state.copyWith(isConnected: true);

      _wsSub = _channel!.stream.listen(
        _onWsData,
        onError: (_) {
          if (!_disposed && mounted) state = state.copyWith(isConnected: false);
        },
        onDone: () {
          if (!_disposed && mounted) state = state.copyWith(isConnected: false);
        },
        cancelOnError: false,
      );
    } catch (e) {
      debugPrint('[AvatarProvider] WS 연결 실패: $e');
    }
  }

  void _onWsData(dynamic raw) {
    if (_disposed) return;
    try {
      final text = raw is String ? raw : String.fromCharCodes(raw as List<int>);
      final json = jsonDecode(text) as Map<String, dynamic>;
      final event = EventModel.fromJson(json);
      _handleEvent(event);
    } catch (_) {}
  }

  void _handleEvent(EventModel event) {
    if (!mounted || _disposed) return;
    switch (event.type) {

      case EventType.aiSpeech:
        final text = event.data['text'] as String?;
        if (text != null && text.isNotEmpty) _speak(text);

      // 4번 답변 완료 신호 — TTS 즉시 중단하고 영상 화면 바로 전환
      case EventType.videoPlayRequested:
        if (state.videoTriggered) return;
        final url = event.data['videoUrl'] as String? ?? _kDefaultVideoUrl;
        // TTS 진행 중이더라도 즉시 중단 (대기하지 않음)
        _tts.stop();
        if (mounted) {
          state = state.copyWith(
            shouldPlayVideo: true,
            videoUrl: url,
            videoTriggered: true,
          );
        }

      case EventType.aiListening:
        if (mounted && !state.videoTriggered) {
          state = state.copyWith(mode: AvatarMode.listening, displayText: '말씀하세요...');
        }

      case EventType.userBJoined:
        _speak('어서 오세요! 마이크 버튼을 누르고 말씀해 주세요.');

      case EventType.aiIntroStarted:
        _playIntro();

      default:
        break;
    }
  }

  /// 화면의 "대화 시작" 버튼 클릭 시 호출 (브라우저 자동재생 정책 대응)
  Future<void> startIntro() async {
    if (_disposed || state.hasStarted) return;
    if (mounted) state = state.copyWith(hasStarted: true);
    await _playIntro();
  }

  Future<void> _playIntro() async {
    if (_disposed) return;
    const introText =
        '안녕하세요! 저는 AI 어시스턴트입니다. '
        '링크로 접속하신 분과 곧 대화를 시작하겠습니다. '
        '잠시만 기다려 주세요.';
    if (mounted) state = state.copyWith(mode: AvatarMode.intro, displayText: introText);
    await _tts.speak(introText);
  }

  Future<void> _speak(String text) async {
    if (_disposed) return;
    if (mounted) state = state.copyWith(displayText: text);
    await _tts.stop();
    await _tts.speak(text);
    // Web에서 speak()는 즉시 반환 — 완료는 setCompletionHandler에서 처리
  }

  void _sendWsEvent(Map<String, dynamic> payload) {
    try {
      _channel?.sink.add(jsonEncode(payload));
    } catch (_) {}
  }

  @override
  void dispose() {
    _disposed = true;
    _wsSub?.cancel();
    _channel?.sink.close();
    _tts.stop();
    super.dispose();
  }
}

final avatarProvider =
    StateNotifierProvider.family<AvatarNotifier, AvatarState, String>(
  (ref, sessionId) => AvatarNotifier(sessionId),
);

import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/models/event_model.dart';
import '../../../core/network/websocket_service.dart';
import '../../session/providers/session_provider.dart';
import '../../cast/services/cast_service.dart';
import '../../cast/providers/cast_provider.dart';

class ControlState {
  final List<EventModel> events;
  final bool isVideoPlayRequested;
  final bool isConnectedToWs;
  final String? error;

  /// Backend에서 video.play.requested 이벤트로 전달된 URL
  final String? videoUrl;

  /// AI가 마지막으로 보낸 메시지 (aiQuestionSent 이벤트의 data.message)
  final String? lastAiMessage;

  const ControlState({
    this.events = const [],
    this.isVideoPlayRequested = false,
    this.isConnectedToWs = false,
    this.error,
    this.videoUrl,
    this.lastAiMessage,
  });

  ControlState copyWith({
    List<EventModel>? events,
    bool? isVideoPlayRequested,
    bool? isConnectedToWs,
    String? error,
    bool clearError = false,
    String? videoUrl,
    String? lastAiMessage,
  }) =>
      ControlState(
        events: events ?? this.events,
        isVideoPlayRequested:
            isVideoPlayRequested ?? this.isVideoPlayRequested,
        isConnectedToWs: isConnectedToWs ?? this.isConnectedToWs,
        error: clearError ? null : (error ?? this.error),
        videoUrl: videoUrl ?? this.videoUrl,
        lastAiMessage: lastAiMessage ?? this.lastAiMessage,
      );
}

class ControlNotifier extends StateNotifier<ControlState> {
  final WebSocketService _ws;
  final SessionNotifier _sessionNotifier;
  final CastService _castService;
  StreamSubscription<EventModel>? _sub;

  ControlNotifier(this._ws, this._sessionNotifier, this._castService)
      : super(const ControlState());

  void connectWebSocket(String sessionId) {
    _ws.connect(sessionId);
    state = state.copyWith(isConnectedToWs: true);
    _sub = _ws.events.listen(_handleEvent);
  }

  void _handleEvent(EventModel event) {
    if (!mounted) return; // disposed 후 state 변경 방지

    final updated = [event, ...state.events].take(50).toList();
    state = state.copyWith(events: updated);

    switch (event.type) {
      case EventType.userBJoined:
        _sessionNotifier.markUserBJoined();

      case EventType.aiQuestionSent:
        final message = event.data['message'] as String?;
        if (message != null && message.isNotEmpty) {
          state = state.copyWith(lastAiMessage: message);
        }

      case EventType.videoPlayRequested:
        // Backend AI 흐름 판단 → 자동 재생 이벤트
        // Flutter 앱은 이를 받아 Cast Receiver에 중계하기만 함
        final videoUrl = event.data['videoUrl'] as String?;
        if (videoUrl != null && videoUrl.isNotEmpty) {
          _castService.playVideo(videoUrl); // unawaited: fire-and-forward
          state = state.copyWith(
            isVideoPlayRequested: true,
            videoUrl: videoUrl,
          );
        } else {
          // videoUrl 없이도 재생 요청 상태는 기록
          state = state.copyWith(isVideoPlayRequested: true);
        }

      case EventType.videoPlaying:
        // Cast Receiver가 실제 재생 시작했을 때 수신
        final videoUrl = event.data['videoUrl'] as String?;
        state = state.copyWith(
          isVideoPlayRequested: true,
          videoUrl: videoUrl ?? state.videoUrl,
        );

      default:
        break;
    }
  }

  // Flutter 앱에서 직접 재생 트리거하는 메서드는 의도적으로 제공하지 않음.
  // 영상 재생은 반드시 Backend AI 흐름 이벤트로만 발생해야 합니다.

  Future<void> sendSmsInvite() => _sessionNotifier.sendInvite();

  @override
  void dispose() {
    _sub?.cancel();
    _ws.disconnect();
    super.dispose();
  }
}

final controlProvider =
    StateNotifierProvider<ControlNotifier, ControlState>((ref) {
  return ControlNotifier(
    ref.watch(webSocketServiceProvider),
    ref.read(sessionProvider.notifier),
    ref.watch(castServiceProvider), // CastService 주입: WS 이벤트 → Cast 자동 중계
  );
});

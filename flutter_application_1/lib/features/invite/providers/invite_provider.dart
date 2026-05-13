import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:speech_to_text/speech_to_text.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

import '../../../core/config/app_config.dart';
import '../../../core/models/event_model.dart';
import '../../../core/network/api_client.dart';

enum InviteMode { connecting, aiSpeaking, myTurn, processing, error, videoPlaying }

class InviteState {
  final InviteMode mode;
  final String aiMessage;
  final String myMessage;
  final String? sessionId;
  final bool isConnected;
  final bool isListening;
  final String? errorMessage;

  /// 4번 답변 완료 후 TV 영상 재생 중 상태 (User B 화면에 연출 표시)
  final bool isVideoPlaying;

  /// STT(음성 인식) 사용 가능 여부 — false면 텍스트 입력 UI로 전환
  final bool sttAvailable;

  const InviteState({
    this.mode = InviteMode.connecting,
    this.aiMessage = '',
    this.myMessage = '',
    this.sessionId,
    this.isConnected = false,
    this.isListening = false,
    this.errorMessage,
    this.isVideoPlaying = false,
    this.sttAvailable = false,
  });

  InviteState copyWith({
    InviteMode? mode,
    String? aiMessage,
    String? myMessage,
    String? sessionId,
    bool? isConnected,
    bool? isListening,
    String? errorMessage,
    bool? isVideoPlaying,
    bool? sttAvailable,
    bool clearError = false,
  }) =>
      InviteState(
        mode: mode ?? this.mode,
        aiMessage: aiMessage ?? this.aiMessage,
        myMessage: myMessage ?? this.myMessage,
        sessionId: sessionId ?? this.sessionId,
        isConnected: isConnected ?? this.isConnected,
        isListening: isListening ?? this.isListening,
        errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
        isVideoPlaying: isVideoPlaying ?? this.isVideoPlaying,
        sttAvailable: sttAvailable ?? this.sttAvailable,
      );
}

class InviteNotifier extends StateNotifier<InviteState> {
  final String _token;
  final ApiClient _apiClient;
  final SpeechToText _stt = SpeechToText();
  WebSocketChannel? _channel;
  StreamSubscription? _wsSub;
  bool _disposed = false;
  bool _sttAvailable = false;

  InviteNotifier(this._token, this._apiClient) : super(const InviteState()) {
    _init();
  }

  Future<void> _init() async {
    await _initStt();
    await _resolveAndConnect();
  }

  Future<void> _initStt() async {
    try {
      _sttAvailable = await _stt.initialize(
        onError: (e) => debugPrint('[InviteProvider] STT 오류: $e'),
        onStatus: (s) => debugPrint('[InviteProvider] STT 상태: $s'),
      );
    } catch (e) {
      debugPrint('[InviteProvider] STT 초기화 실패: $e');
      _sttAvailable = false;
    }
    // STT 결과를 InviteState에 반영 (UI가 텍스트/음성 입력 모드를 전환)
    if (mounted) state = state.copyWith(sttAvailable: _sttAvailable);
  }

  Future<void> _resolveAndConnect() async {
    String sessionId;
    try {
      // 토큰 → sessionId 변환 (백엔드 API)
      final res = await _apiClient.get('/sessions/invite/$_token');
      sessionId = res['sessionId'] as String? ?? '';
      if (sessionId.isEmpty) throw Exception('세션을 찾을 수 없습니다');
    } catch (_) {
      // 백엔드 없을 때: 토큰을 sessionId로 직접 사용 (로컬 테스트)
      sessionId = _token;
    }

    if (_disposed) return;
    if (mounted) state = state.copyWith(sessionId: sessionId, clearError: true);

    // User B 접속 알림 (실패해도 계속 진행)
    try {
      await _apiClient.post('/sessions/$sessionId/join', {});
    } catch (_) {}

    _connectWs(sessionId);
  }

  void _connectWs(String sessionId) {
    try {
      final uri = Uri.parse('${AppConfig.wsUrl}/sessions/$sessionId/ws');
      _channel = WebSocketChannel.connect(uri);

      if (!_disposed && mounted) {
        state = state.copyWith(isConnected: true, mode: InviteMode.aiSpeaking);
      }

      _wsSub = _channel!.stream.listen(
        _onWsData,
        onError: (_) {
          if (!_disposed && mounted) {
            state = state.copyWith(
              isConnected: false,
              mode: InviteMode.error,
              errorMessage: '연결이 끊어졌습니다.',
            );
          }
        },
        onDone: () {
          if (!_disposed && mounted) {
            state = state.copyWith(isConnected: false);
          }
        },
        cancelOnError: false,
      );

      // User B 참여 이벤트 WebSocket으로 전송
      _sendWsEvent({
        'type': 'userBJoined',
        'sessionId': sessionId,
        'data': {},
      });
    } catch (e) {
      debugPrint('[InviteProvider] WS 연결 실패: $e');
      // WS 연결 실패해도 UI는 표시 (마이크 사용 가능 상태로)
      if (!_disposed && mounted) {
        state = state.copyWith(
          isConnected: false,
          mode: InviteMode.myTurn,
        );
      }
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
        if (text != null && text.isNotEmpty) {
          state = state.copyWith(
            aiMessage: text,
            mode: InviteMode.aiSpeaking,
            myMessage: '',
          );
        }

      case EventType.aiListening:
        // AI TTS 완료 → User B 마이크 활성화
        if (!state.isVideoPlaying) {
          state = state.copyWith(mode: InviteMode.myTurn);
        }

      // 4번 답변 완료 → TV 영상 재생 시작 신호 수신
      case EventType.videoPlayRequested:
        state = state.copyWith(
          mode: InviteMode.videoPlaying,
          isVideoPlaying: true,
          // 마지막 AI 멘트를 화면에 유지
          aiMessage: state.aiMessage.isNotEmpty
              ? state.aiMessage
              : '특별한 영상을 보내드립니다.',
        );

      default:
        break;
    }
  }

  /// 마이크 버튼 누름: 음성 인식 시작
  Future<void> startListening() async {
    if (!_sttAvailable || state.mode != InviteMode.myTurn) return;
    if (_disposed || !mounted) return;

    state = state.copyWith(isListening: true, myMessage: '');

    await _stt.listen(
      onResult: (result) {
        if (_disposed || !mounted) return;
        state = state.copyWith(myMessage: result.recognizedWords);
        if (result.finalResult && result.recognizedWords.isNotEmpty) {
          _submitSpeech(result.recognizedWords);
        }
      },
      localeId: 'ko_KR',
      listenFor: const Duration(seconds: 30),
      pauseFor: const Duration(seconds: 3),
    );
  }

  /// 마이크 버튼 뗌: 음성 인식 종료 및 전송
  Future<void> stopListening() async {
    if (!_sttAvailable) return;
    await _stt.stop();
    if (_disposed || !mounted) return;

    state = state.copyWith(isListening: false);
    final words = state.myMessage;
    if (words.isNotEmpty) _submitSpeech(words);
  }

  /// 텍스트 입력 모드 (STT 불가 시 또는 로컬 테스트)에서 직접 텍스트 전송
  void submitText(String text) {
    if (text.trim().isEmpty) return;
    if (state.mode != InviteMode.myTurn) return;
    if (mounted) state = state.copyWith(myMessage: text.trim());
    _submitSpeech(text.trim());
  }

  void _submitSpeech(String text) {
    if (_disposed) return;
    if (mounted) state = state.copyWith(mode: InviteMode.processing);
    _sendWsEvent({
      'type': 'userBSpeech',
      'sessionId': state.sessionId ?? _token,
      'data': {'text': text},
    });
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
    if (_sttAvailable) _stt.stop();
    super.dispose();
  }
}

final inviteProvider =
    StateNotifierProvider.family<InviteNotifier, InviteState, String>(
  (ref, token) => InviteNotifier(token, ref.watch(apiClientProvider)),
);

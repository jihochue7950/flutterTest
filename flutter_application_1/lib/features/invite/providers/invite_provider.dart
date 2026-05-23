import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:record/record.dart';
import 'package:speech_to_text/speech_to_text.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

import '../../../core/config/app_config.dart';
import '../../../core/models/event_model.dart';
import '../../../core/network/api_client.dart';

enum InviteMode { connecting, aiSpeaking, myTurn, processing, error, videoPlaying }

// 오디오 입력 모드
enum _InputMode {
  audio,  // PCM16 스트리밍 → OpenAI Realtime (우선)
  stt,    // speech_to_text → 텍스트 전송 (폴백)
  text,   // 텍스트 입력 (최종 폴백)
}

class InviteState {
  final InviteMode mode;
  final String aiMessage;
  final String myMessage;
  final String? sessionId;
  final bool isConnected;
  final bool isListening;
  final String? errorMessage;
  final bool isVideoPlaying;

  /// false → 텍스트 입력 UI 표시
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

  // 오디오 레코더 (PCM16 스트리밍)
  final AudioRecorder _recorder = AudioRecorder();
  StreamSubscription<List<int>>? _audioSub;

  // STT 폴백
  final SpeechToText _stt = SpeechToText();

  WebSocketChannel? _channel;
  StreamSubscription? _wsSub;
  bool _disposed = false;
  _InputMode _inputMode = _InputMode.text;

  InviteNotifier(this._token, this._apiClient) : super(const InviteState()) {
    _init();
  }

  Future<void> _init() async {
    await _detectInputMode();
    await _resolveAndConnect();
  }

  // ── 입력 모드 감지: audio > stt > text ──────────────────────────────────────
  Future<void> _detectInputMode() async {
    // 1순위: PCM16 오디오 스트리밍 (OpenAI Realtime API 경로)
    try {
      final hasMic = await _recorder.hasPermission();
      if (hasMic) {
        _inputMode = _InputMode.audio;
        if (mounted) state = state.copyWith(sttAvailable: true);
        debugPrint('[InviteProvider] 입력 모드: PCM16 오디오 스트리밍');
        return;
      }
    } catch (e) {
      debugPrint('[InviteProvider] 레코더 권한 확인 실패: $e');
    }

    // 2순위: speech_to_text (STT 폴백)
    try {
      final sttOk = await _stt.initialize(
        onError: (e) => debugPrint('[InviteProvider] STT 오류: $e'),
        onStatus: (s) => debugPrint('[InviteProvider] STT 상태: $s'),
      );
      if (sttOk) {
        _inputMode = _InputMode.stt;
        if (mounted) state = state.copyWith(sttAvailable: true);
        debugPrint('[InviteProvider] 입력 모드: STT 폴백');
        return;
      }
    } catch (e) {
      debugPrint('[InviteProvider] STT 초기화 실패: $e');
    }

    // 3순위: 텍스트 입력 전용
    _inputMode = _InputMode.text;
    if (mounted) state = state.copyWith(sttAvailable: false);
    debugPrint('[InviteProvider] 입력 모드: 텍스트 전용');
  }

  // ── WS 연결 ─────────────────────────────────────────────────────────────────
  Future<void> _resolveAndConnect() async {
    String sessionId;
    try {
      final res = await _apiClient.get('/sessions/invite/$_token');
      sessionId = res['sessionId'] as String? ?? '';
      if (sessionId.isEmpty) throw Exception('세션 없음');
    } catch (_) {
      sessionId = _token;
    }

    if (_disposed) return;
    if (mounted) state = state.copyWith(sessionId: sessionId, clearError: true);

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
          if (!_disposed && mounted) state = state.copyWith(isConnected: false);
        },
        cancelOnError: false,
      );

      _sendWsEvent({
        'type': 'userBJoined',
        'sessionId': sessionId,
        'data': {},
      });
    } catch (e) {
      debugPrint('[InviteProvider] WS 연결 실패: $e');
      if (!_disposed && mounted) {
        state = state.copyWith(isConnected: false, mode: InviteMode.myTurn);
      }
    }
  }

  // ── WS 이벤트 수신 ───────────────────────────────────────────────────────────
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
        if (!state.isVideoPlaying) {
          state = state.copyWith(mode: InviteMode.myTurn);
        }

      case EventType.videoPlayRequested:
        state = state.copyWith(
          mode: InviteMode.videoPlaying,
          isVideoPlaying: true,
          aiMessage: state.aiMessage.isNotEmpty
              ? state.aiMessage
              : '특별한 영상을 보내드립니다.',
        );

      // OpenAI Realtime이 오디오를 전사한 텍스트 수신 → 내 말풍선에 표시
      case EventType.userBSpeech:
        final text = event.data['text'] as String?;
        if (text != null && text.isNotEmpty && mounted) {
          state = state.copyWith(myMessage: text);
        }

      default:
        break;
    }
  }

  // ── 마이크 버튼 누름 ─────────────────────────────────────────────────────────
  Future<void> startListening() async {
    if (state.mode != InviteMode.myTurn || _disposed) return;
    if (mounted) state = state.copyWith(isListening: true, myMessage: '');

    switch (_inputMode) {
      case _InputMode.audio:
        await _startAudioStream();
      case _InputMode.stt:
        await _startStt();
      case _InputMode.text:
        // 텍스트 모드는 버튼 없음 — 호출되지 않음
        break;
    }
  }

  // ── 마이크 버튼 뗌 ───────────────────────────────────────────────────────────
  Future<void> stopListening() async {
    switch (_inputMode) {
      case _InputMode.audio:
        await _stopAudioStream();
      case _InputMode.stt:
        await _stopStt();
      case _InputMode.text:
        break;
    }
  }

  // ── PCM16 오디오 스트리밍 (OpenAI Realtime 경로) ─────────────────────────────
  Future<void> _startAudioStream() async {
    try {
      final audioStream = await _recorder.startStream(
        const RecordConfig(
          encoder: AudioEncoder.pcm16bits,
          sampleRate: 24000,
          numChannels: 1,
        ),
      );

      _audioSub = audioStream.listen(
        (chunk) {
          if (_disposed || _channel == null) return;
          // chunk(Uint8List) → base64 → audioChunk 이벤트
          final b64 = base64Encode(chunk);
          _sendWsEvent({
            'type': 'audioChunk',
            'sessionId': state.sessionId ?? _token,
            'data': b64,
          });
        },
        onError: (e) {
          debugPrint('[InviteProvider] 오디오 스트림 오류: $e');
          _stopAudioStream();
        },
      );
      debugPrint('[InviteProvider] PCM16 오디오 스트리밍 시작');
    } catch (e) {
      debugPrint('[InviteProvider] 오디오 스트리밍 실패, STT로 전환: $e');
      // 오디오 실패 시 STT로 자동 전환
      _inputMode = _InputMode.stt;
      await _startStt();
    }
  }

  Future<void> _stopAudioStream() async {
    await _audioSub?.cancel();
    _audioSub = null;
    try {
      await _recorder.stop();
    } catch (_) {}

    if (_disposed || !mounted) return;
    state = state.copyWith(isListening: false, mode: InviteMode.processing);

    // 오디오 버퍼 커밋 → AI 응답 요청
    _sendWsEvent({
      'type': 'audioCommit',
      'sessionId': state.sessionId ?? _token,
    });
    debugPrint('[InviteProvider] 오디오 커밋 전송');
  }

  // ── STT 폴백 ─────────────────────────────────────────────────────────────────
  Future<void> _startStt() async {
    await _stt.listen(
      onResult: (result) {
        if (_disposed || !mounted) return;
        state = state.copyWith(myMessage: result.recognizedWords);
        if (result.finalResult && result.recognizedWords.isNotEmpty) {
          _submitText(result.recognizedWords);
        }
      },
      localeId: 'ko_KR',
      listenFor: const Duration(seconds: 30),
      pauseFor: const Duration(seconds: 3),
    );
  }

  Future<void> _stopStt() async {
    await _stt.stop();
    if (_disposed || !mounted) return;
    state = state.copyWith(isListening: false);
    final words = state.myMessage;
    if (words.isNotEmpty) _submitText(words);
  }

  // ── 텍스트 입력 모드 ─────────────────────────────────────────────────────────
  void submitText(String text) {
    if (text.trim().isEmpty || state.mode != InviteMode.myTurn) return;
    if (mounted) state = state.copyWith(myMessage: text.trim());
    _submitText(text.trim());
  }

  void _submitText(String text) {
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
      payload['timestamp'] = DateTime.now().toIso8601String();
      _channel?.sink.add(jsonEncode(payload));
    } catch (_) {}
  }

  @override
  void dispose() {
    _disposed = true;
    _wsSub?.cancel();
    _channel?.sink.close();
    _audioSub?.cancel();
    _recorder.dispose();
    if (_inputMode == _InputMode.stt) _stt.stop();
    super.dispose();
  }
}

final inviteProvider =
    StateNotifierProvider.family<InviteNotifier, InviteState, String>(
  (ref, token) => InviteNotifier(token, ref.watch(apiClientProvider)),
);

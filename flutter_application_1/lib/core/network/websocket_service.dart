import 'dart:async';
import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import '../config/app_config.dart';
import '../models/event_model.dart';

class WebSocketService {
  WebSocketChannel? _channel;
  final StreamController<EventModel> _controller =
      StreamController<EventModel>.broadcast();
  bool _isConnected = false;

  Stream<EventModel> get events => _controller.stream;
  bool get isConnected => _isConnected;

  void connect(String sessionId) {
    if (_isConnected) disconnect();

    final uri = Uri.parse('${AppConfig.wsUrl}/sessions/$sessionId/ws');
    _channel = WebSocketChannel.connect(uri);
    _isConnected = true;

    _channel!.stream.listen(
      (data) {
        try {
          // 바이너리 프레임이 올 수도 있으므로 String 여부 먼저 확인
          final text = data is String ? data : String.fromCharCodes(data as List<int>);
          final decoded = jsonDecode(text);
          if (decoded is Map<String, dynamic>) {
            _controller.add(EventModel.fromJson(decoded));
          }
        } catch (_) {
          // 파싱 실패 시 무시 (연결은 유지)
        }
      },
      onError: (e) {
        _isConnected = false;
        // stream controller가 닫히지 않았으면 에러 무시 (재연결 로직은 상위에서 처리)
      },
      onDone: () => _isConnected = false,
      cancelOnError: false, // 에러 발생 시 구독 유지
    );
  }

  void sendEvent(Map<String, dynamic> payload) {
    if (!_isConnected || _channel == null) return;
    _channel!.sink.add(jsonEncode(payload));
  }

  /// 로컬 테스트 전용: 백엔드 없이 이벤트를 스트림에 직접 주입합니다.
  void injectTestEvent(EventModel event) {
    if (!_controller.isClosed) _controller.add(event);
  }

  void disconnect() {
    _channel?.sink.close();
    _channel = null;
    _isConnected = false;
  }

  void dispose() {
    disconnect();
    _controller.close();
  }
}

final webSocketServiceProvider = Provider<WebSocketService>((ref) {
  final service = WebSocketService();
  ref.onDispose(service.dispose);
  return service;
});

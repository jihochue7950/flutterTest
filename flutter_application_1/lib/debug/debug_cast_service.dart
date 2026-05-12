import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../features/cast/services/cast_service.dart';

enum CastCommandType { discover, connect, disconnect, sendMessage, playVideo }

class CastCommandLog {
  final CastCommandType type;
  final Map<String, dynamic> data;
  final DateTime timestamp;

  CastCommandLog({required this.type, required this.data})
      : timestamp = DateTime.now();

  String get label {
    switch (type) {
      case CastCommandType.discover:
        return '기기 검색 시작';
      case CastCommandType.connect:
        return '연결: ${data['deviceName'] ?? '-'} (session: ${(data['sessionId'] as String? ?? '').substring(0, 8)}...)';
      case CastCommandType.disconnect:
        return '연결 해제';
      case CastCommandType.sendMessage:
        return '메시지: ${data.toString()}';
      case CastCommandType.playVideo:
        return '영상 재생: ${data['url'] ?? '-'}';
    }
  }
}

/// MockCastService를 래핑하여 모든 Cast 명령을 스트림에 기록합니다.
/// 로컬 테스트 전용 — 실 배포 시 Google Cast SDK 구현으로 교체.
class DebugCastService implements CastService {
  final MockCastService _mock = MockCastService();
  final StreamController<CastCommandLog> _logController =
      StreamController<CastCommandLog>.broadcast();

  Stream<CastCommandLog> get commandLog => _logController.stream;
  final List<CastCommandLog> logs = [];

  void _log(CastCommandType type, Map<String, dynamic> data) {
    final entry = CastCommandLog(type: type, data: data);
    logs.add(entry);
    if (!_logController.isClosed) _logController.add(entry);
  }

  @override
  bool get isConnected => _mock.isConnected;

  @override
  CastDevice? get connectedDevice => _mock.connectedDevice;

  @override
  Future<List<CastDevice>> discoverDevices() async {
    _log(CastCommandType.discover, {});
    return _mock.discoverDevices();
  }

  @override
  Future<bool> connect(CastDevice device, String sessionId) async {
    _log(CastCommandType.connect, {
      'deviceId': device.id,
      'deviceName': device.name,
      'sessionId': sessionId,
    });
    return _mock.connect(device, sessionId);
  }

  @override
  Future<void> sendMessage(Map<String, dynamic> message) async {
    _log(CastCommandType.sendMessage, message);
    return _mock.sendMessage(message);
  }

  @override
  Future<void> playVideo(String videoUrl) async {
    _log(CastCommandType.playVideo, {'url': videoUrl});
    return _mock.playVideo(videoUrl);
  }

  @override
  Future<void> disconnect() async {
    _log(CastCommandType.disconnect, {});
    return _mock.disconnect();
  }

  void dispose() {
    _logController.close();
  }
}

final debugCastServiceProvider = Provider<DebugCastService>((ref) {
  final service = DebugCastService();
  ref.onDispose(service.dispose);
  return service;
});

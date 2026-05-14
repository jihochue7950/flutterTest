import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../features/cast/services/cast_service.dart';

// ============================================================
// 파일: debug_cast_service.dart
// 역할: 개발/테스트 전용 Cast 서비스.
//       MockCastService를 감싸서 모든 Cast 명령을 스트림에 기록합니다.
//       실제 크롬캐스트 없이도 연결 흐름을 테스트할 수 있습니다.
//
// ★ 실제 배포 시 이 파일은 사용하지 않습니다.
//   cast_provider.dart에서 castServiceProvider가
//   GoogleCastService()를 반환하도록 변경하면 됩니다.
//
// ★ 크롬캐스트 실제 구현 시 필요한 작업 목록:
//   ① Google Cast SDK 설치
//      Android: build.gradle에 `com.google.android.gms:play-services-cast` 추가
//      iOS: Podfile에 `google-cast-sdk` 추가
//
//   ② Google Cast Developer Console에서 앱 등록
//      https://cast.google.com/publish
//      → Application ID 발급 (Receiver 앱 식별자)
//
//   ③ Cast Receiver 앱 결정
//      - Default Media Receiver: URL만 넘기면 기본 플레이어로 재생 (간단)
//      - Styled Media Receiver: 기본 플레이어 + 커스텀 CSS
//      - Custom Receiver: 완전히 커스텀한 TV 화면 (AI 아바타 표시 가능)
//        → HTML/JS로 제작 후 호스팅 필요
//
//   ④ Flutter에서 플랫폼 채널 구현
//      lib/features/cast/services/google_cast_service.dart 파일 생성:
//
//      class GoogleCastService implements CastService {
//        static const _channel = MethodChannel('com.yourapp/cast');
//
//        @override
//        Future<List<CastDevice>> discoverDevices() async {
//          final result = await _channel.invokeMethod('discoverDevices');
//          return (result as List).map((e) => CastDevice.fromJson(e)).toList();
//        }
//
//        @override
//        Future<bool> connect(CastDevice device, String sessionId) async {
//          return await _channel.invokeMethod('connect', {
//            'deviceId': device.id,
//            'sessionId': sessionId,
//            'applicationId': 'YOUR_APP_ID', // Cast Developer Console에서 발급
//          });
//        }
//
//        @override
//        Future<void> playVideo(String videoUrl) async {
//          await _channel.invokeMethod('playVideo', {'url': videoUrl});
//        }
//        // ...
//      }
//
//   ⑤ Android 네이티브 코드 (MainActivity.kt)
//      MethodChannel 등록 + CastContext 초기화
//      CastSession 관리 (connect/disconnect)
//      RemoteMediaClient.load(MediaInfo) 로 영상 전송
//
//   ⑥ iOS 네이티브 코드 (AppDelegate.swift)
//      GCKCastContext.setSharedInstance() 초기화
//      GCKSessionManager로 연결 관리
//      GCKRemoteMediaClient.loadMedia() 로 영상 전송
// ============================================================

/// Cast 명령의 종류를 나타내는 열거형.
/// 테스트 패널에서 어떤 명령이 발생했는지 로그에 표시하기 위해 사용합니다.
enum CastCommandType { discover, connect, disconnect, sendMessage, playVideo }

/// Cast 명령 하나를 기록하는 로그 항목.
///
/// TestPanelScreen에서 이 로그를 화면에 표시합니다.
class CastCommandLog {
  final CastCommandType type;
  final Map<String, dynamic> data;
  final DateTime timestamp;

  CastCommandLog({required this.type, required this.data})
      : timestamp = DateTime.now();

  /// 로그 항목을 사람이 읽기 쉬운 문자열로 변환합니다.
  String get label {
    switch (type) {
      case CastCommandType.discover:
        return '기기 검색 시작';
      case CastCommandType.connect:
        return '연결 시도: ${data['deviceName'] ?? '-'} '
            '(session: ${(data['sessionId'] as String? ?? '').substring(0, 8)}...)';
      case CastCommandType.disconnect:
        return '연결 해제';
      case CastCommandType.sendMessage:
        return '메시지 전송: ${data.toString()}';
      case CastCommandType.playVideo:
        return '영상 재생 요청: ${data['url'] ?? '-'}';
    }
  }
}

/// MockCastService를 감싸는 디버그용 서비스.
///
/// 역할:
///   - MockCastService의 모든 메서드를 그대로 위임합니다.
///   - 각 호출을 [commandLog] 스트림에 기록합니다.
///   - TestPanelScreen에서 이 스트림을 구독해 명령 목록을 표시합니다.
///
/// 실제 Google Cast SDK로 교체 시 이 클래스는 더 이상 사용하지 않습니다.
class DebugCastService implements CastService {
  // 내부적으로 MockCastService를 사용해 동작을 시뮬레이션합니다.
  final MockCastService _mock = MockCastService();

  // 외부에서 구독할 수 있는 브로드캐스트 스트림.
  // TestPanelScreen이 이 스트림을 듣고 화면에 로그를 표시합니다.
  final StreamController<CastCommandLog> _logController =
      StreamController<CastCommandLog>.broadcast();

  /// Cast 명령 스트림 (외부 구독용).
  Stream<CastCommandLog> get commandLog => _logController.stream;

  /// 발생한 모든 명령 기록 (화면 표시용 전체 목록).
  final List<CastCommandLog> logs = [];

  /// 명령 하나를 스트림과 목록에 기록합니다.
  void _log(CastCommandType type, Map<String, dynamic> data) {
    final entry = CastCommandLog(type: type, data: data);
    logs.add(entry);
    if (!_logController.isClosed) _logController.add(entry);
  }

  @override
  bool get isConnected => _mock.isConnected;

  @override
  CastDevice? get connectedDevice => _mock.connectedDevice;

  /// [Step 1] 기기 탐색 — Wi-Fi에서 크롬캐스트 기기를 검색합니다.
  ///
  /// Mock: 2초 대기 후 가상 TV 목록(거실 TV, 침실 TV) 반환.
  /// 실제: Google Cast SDK가 mDNS로 실제 기기를 탐색.
  @override
  Future<List<CastDevice>> discoverDevices() async {
    _log(CastCommandType.discover, {});
    return _mock.discoverDevices();
  }

  /// [Step 3] TV 연결 — 선택한 기기에 Receiver 앱을 실행하고 연결합니다.
  ///
  /// Mock: 1.2초 대기 후 연결 성공 처리.
  /// 실제: Google Cast SDK로 TV에 Application ID의 Receiver 앱 실행.
  ///       TV 화면에 연결 UI가 나타남.
  @override
  Future<bool> connect(CastDevice device, String sessionId) async {
    _log(CastCommandType.connect, {
      'deviceId': device.id,
      'deviceName': device.name,
      'sessionId': sessionId,
    });
    return _mock.connect(device, sessionId);
  }

  /// TV 리시버 앱에 커스텀 JSON 메시지를 전송합니다.
  ///
  /// Mock: 50ms 대기 후 완료 처리.
  /// 실제: Cast Custom Message Channel을 통해 JSON 전달.
  @override
  Future<void> sendMessage(Map<String, dynamic> message) async {
    _log(CastCommandType.sendMessage, message);
    return _mock.sendMessage(message);
  }

  /// [Step 6] TV에서 영상을 재생합니다.
  ///
  /// Mock: 100ms 대기 후 완료 처리 (실제로 TV에 영상 전송 없음).
  /// 실제: RemoteMediaClient.load(MediaInfo)로 URL을 TV에 전달 → 재생.
  ///       ★ 주의: URL은 TV에서 접근 가능한 http(s) 주소여야 합니다.
  ///              (flutter assets/... 경로는 TV에서 직접 재생 불가)
  @override
  Future<void> playVideo(String videoUrl) async {
    _log(CastCommandType.playVideo, {'url': videoUrl});
    return _mock.playVideo(videoUrl);
  }

  /// 크롬캐스트 연결을 끊습니다.
  ///
  /// 실제: CastSession.endSession()으로 TV Receiver 앱 종료.
  @override
  Future<void> disconnect() async {
    _log(CastCommandType.disconnect, {});
    return _mock.disconnect();
  }

  /// 리소스를 해제합니다. Provider가 dispose될 때 자동 호출됩니다.
  void dispose() {
    _logController.close();
  }
}

/// DebugCastService 인스턴스를 앱 전체에 제공하는 Provider.
///
/// ref.watch(debugCastServiceProvider)로 TestPanelScreen 등에서 접근합니다.
final debugCastServiceProvider = Provider<DebugCastService>((ref) {
  final service = DebugCastService();
  ref.onDispose(service.dispose);
  return service;
});

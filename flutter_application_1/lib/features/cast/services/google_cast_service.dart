import 'package:flutter/services.dart';
import 'cast_service.dart';

// ============================================================
// 파일: google_cast_service.dart
// 역할: 실제 Google Cast SDK와 통신하는 운영 버전 CastService.
//       Flutter의 MethodChannel을 통해 Android/iOS 네이티브 코드를 호출합니다.
//
// ★ 사용 조건: env.prod.json에 "USE_REAL_CAST": "true" 가 있을 때만 사용됨.
//   로컬(env.local.json)에서는 DebugCastService(Mock)가 사용됨.
//
// ★ MethodChannel 통신 구조:
//   Flutter(Dart) ──[MethodChannel]──▶ Android(Kotlin) CastPlugin.kt
//                                    └─▶ iOS(Swift)    CastPlugin.swift
//
// ★ 채널 이름: "com.example.flutter_application_1/cast"
//   - Android CastPlugin.kt의 CHANNEL 상수와 일치해야 함
//   - iOS CastPlugin.swift의 channelName과 일치해야 함
// ============================================================

class GoogleCastService implements CastService {
  // MethodChannel: Flutter ↔ 네이티브(Android/iOS) 양방향 통신 채널
  // 채널 이름은 플랫폼 코드와 반드시 동일해야 함
  static const MethodChannel _channel =
      MethodChannel('com.example.flutter_application_1/cast');

  // 연결 상태를 로컬에서 캐시 (네이티브에 매번 물어보지 않기 위해)
  bool _isConnected = false;
  CastDevice? _connectedDevice;

  @override
  bool get isConnected => _isConnected;

  @override
  CastDevice? get connectedDevice => _connectedDevice;

  // ----------------------------------------------------------
  // 기기 탐색
  // 네이티브에서 Wi-Fi를 통해 Chromecast 기기를 검색한 결과를 받아옵니다.
  //
  // 반환: CastDevice 목록 (이름, 모델명, 기기 ID)
  // 실패 시: 빈 목록 반환 (앱 크래시 방지)
  // ----------------------------------------------------------
  @override
  Future<List<CastDevice>> discoverDevices() async {
    try {
      // 네이티브의 'discoverDevices' 메서드 호출 → 기기 목록(List<Map>) 반환
      final result =
          await _channel.invokeMethod<List<dynamic>>('discoverDevices');

      if (result == null) return [];

      // 네이티브에서 받은 Map 데이터를 CastDevice 객체로 변환
      return result.map((e) {
        final map = Map<String, dynamic>.from(e as Map);
        return CastDevice(
          id: (map['id'] as String?) ?? '',
          name: (map['name'] as String?) ?? 'Unknown',
          model: (map['model'] as String?) ?? 'Chromecast',
        );
      }).toList();
    } on PlatformException catch (e) {
      // 네이티브 오류 (Google Play Services 없음, Cast SDK 미초기화 등)
      throw Exception('기기 탐색 실패: ${e.message}');
    } on MissingPluginException {
      // 네이티브 채널이 등록되지 않은 경우 (시뮬레이터 등)
      throw Exception('Cast 플러그인이 등록되지 않았습니다. 실제 기기에서 실행하세요.');
    }
  }

  // ----------------------------------------------------------
  // TV 연결
  // 선택한 Chromecast 기기에 Receiver 앱을 실행하고 세션을 시작합니다.
  //
  // [device]    : 연결할 기기 (discoverDevices 결과)
  // [sessionId] : 현재 세션 ID (TV Receiver에서 백엔드 WebSocket 연결에 사용)
  // 반환: 연결 성공 여부
  // ----------------------------------------------------------
  @override
  Future<bool> connect(CastDevice device, String sessionId) async {
    try {
      // 네이티브에 기기 ID, 세션 ID 전달 → Cast 연결 요청
      final success = await _channel.invokeMethod<bool>('connect', {
            'deviceId': device.id,
            'deviceName': device.name,
            'sessionId': sessionId, // Receiver 앱에 세션 ID 전달용
          }) ??
          false;

      if (success) {
        _isConnected = true;
        _connectedDevice = device.copyWith(isConnected: true);
      }
      return success;
    } on PlatformException catch (e) {
      throw Exception('연결 실패: ${e.message}');
    } on MissingPluginException {
      throw Exception('Cast 플러그인이 등록되지 않았습니다. 실제 기기에서 실행하세요.');
    }
  }

  // ----------------------------------------------------------
  // TV에 커스텀 메시지 전송
  // Custom Receiver를 사용할 때 JSON 메시지를 TV로 전달합니다.
  // Default Media Receiver(CC1AD845)에서는 사용하지 않음.
  // ----------------------------------------------------------
  @override
  Future<void> sendMessage(Map<String, dynamic> message) async {
    try {
      await _channel.invokeMethod('sendMessage', message);
    } on PlatformException catch (e) {
      throw Exception('메시지 전송 실패: ${e.message}');
    } on MissingPluginException {
      throw Exception('Cast 플러그인이 등록되지 않았습니다.');
    }
  }

  // ----------------------------------------------------------
  // TV에서 영상 재생
  // RemoteMediaClient를 통해 TV에 영상 URL을 전달하고 재생합니다.
  //
  // ★ 주의: [videoUrl]은 TV에서 접근 가능한 http(s) URL이어야 합니다.
  //   - flutter의 'assets/video/proposal.mp4' 경로는 TV에서 재생 불가
  //   - 반드시 CDN 또는 서버에 업로드된 URL을 사용해야 함
  //   - 예: 'https://cdn.yourapp.com/videos/proposal.mp4'
  // ----------------------------------------------------------
  @override
  Future<void> playVideo(String videoUrl) async {
    // assets 경로를 직접 전달하면 TV에서 재생 불가 → 경고
    if (videoUrl.startsWith('assets/')) {
      throw Exception(
        '크롬캐스트는 로컬 에셋 경로를 재생할 수 없습니다.\n'
        '반드시 https://... 형태의 서버 URL을 사용하세요.',
      );
    }

    try {
      await _channel.invokeMethod('playVideo', {'url': videoUrl});
    } on PlatformException catch (e) {
      throw Exception('영상 재생 실패: ${e.message}');
    } on MissingPluginException {
      throw Exception('Cast 플러그인이 등록되지 않았습니다.');
    }
  }

  // ----------------------------------------------------------
  // 연결 해제
  // Cast 세션을 종료하고 TV Receiver 앱을 닫습니다.
  // ----------------------------------------------------------
  @override
  Future<void> disconnect() async {
    try {
      await _channel.invokeMethod('disconnect');
      _isConnected = false;
      _connectedDevice = null;
    } on PlatformException catch (e) {
      throw Exception('연결 해제 실패: ${e.message}');
    } on MissingPluginException {
      throw Exception('Cast 플러그인이 등록되지 않았습니다.');
    }
  }
}

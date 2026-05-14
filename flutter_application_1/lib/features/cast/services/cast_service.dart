import 'package:equatable/equatable.dart';

// ============================================================
// 파일: cast_service.dart
// 역할: 크롬캐스트 기기 정보(CastDevice)와
//       캐스팅 동작 인터페이스(CastService)를 정의합니다.
//
// ★ 현재 상태: MockCastService(가짜 구현)를 사용 중
//   → 실제 TV에 영상을 전송하려면 Google Cast SDK를 연동한
//     실제 구현체로 교체해야 합니다.
//
// ★ 실제 크롬캐스트 연동에 필요한 것:
//   1. 하드웨어
//      - 크롬캐스트 동글 (TV HDMI 포트에 꽂는 스틱, 약 5~7만원)
//        또는
//      - 크롬캐스트 내장 TV (Google TV / Android TV 탑재 모델)
//      - 폰과 TV가 반드시 같은 Wi-Fi 네트워크에 연결되어 있어야 함
//
//   2. 소프트웨어 (현재 없음 → 추가 필요)
//      - Google Cast SDK for Android / iOS
//        패키지: flutter_cast_framework 또는 네이티브 플랫폼 채널
//      - Google Cast Developer Console에서 앱 등록
//        → Application ID 발급받아 SDK 초기화에 사용
//      - Cast Receiver 앱 (TV에서 실행되는 앱)
//        → 기본 미디어 리시버(Default Media Receiver) 사용 가능
//        → 커스텀 UI가 필요하면 Hosted Receiver 앱 직접 개발 필요
// ============================================================

/// 크롬캐스트 기기 한 대의 정보를 담는 데이터 클래스.
///
/// 같은 Wi-Fi에서 발견된 기기마다 하나씩 생성됩니다.
/// - [id]   : 기기 고유 식별자 (IP 또는 UUID 형태)
/// - [name] : TV에 설정된 이름 (예: "거실 TV")
/// - [model]: 크롬캐스트 모델명 (예: "Chromecast with Google TV (4K)")
/// - [isConnected]: 현재 앱이 이 기기에 연결되어 있는지 여부
class CastDevice extends Equatable {
  final String id;
  final String name;
  final String model;
  final bool isConnected;

  const CastDevice({
    required this.id,
    required this.name,
    required this.model,
    this.isConnected = false,
  });

  CastDevice copyWith({
    String? id,
    String? name,
    String? model,
    bool? isConnected,
  }) =>
      CastDevice(
        id: id ?? this.id,
        name: name ?? this.name,
        model: model ?? this.model,
        isConnected: isConnected ?? this.isConnected,
      );

  @override
  List<Object?> get props => [id, name, model, isConnected];
}

// ============================================================
// CastService — 크롬캐스트 동작을 정의하는 추상 인터페이스
//
// 이 인터페이스를 구현한 클래스를 교체하면
// 테스트/운영 환경을 쉽게 전환할 수 있습니다.
//
//   현재: MockCastService (가짜 구현, 실제 TV 연결 없음)
//   목표: GoogleCastService (실제 Google Cast SDK 연동)
// ============================================================
abstract class CastService {
  /// 같은 Wi-Fi 네트워크의 크롬캐스트 기기를 검색합니다.
  ///
  /// 실제 구현 시:
  ///   - Google Cast SDK의 CastContext.getSessionManager()로
  ///     주변 기기를 mDNS(멀티캐스트 DNS)로 탐색합니다.
  ///   - 보통 2~5초 소요.
  Future<List<CastDevice>> discoverDevices();

  /// 선택한 크롬캐스트 기기에 연결합니다.
  ///
  /// [device]    : 연결할 기기 (discoverDevices 결과 중 선택)
  /// [sessionId] : 현재 프로포즈 세션 ID (리시버 앱에 전달)
  ///
  /// 실제 구현 시:
  ///   - CastSession을 시작하고
  ///   - 등록한 Receiver 앱(Application ID)을 TV에서 실행합니다.
  ///   - 연결 성공 시 true 반환.
  Future<bool> connect(CastDevice device, String sessionId);

  /// TV(리시버 앱)에 커스텀 메시지를 전송합니다.
  ///
  /// 실제 구현 시:
  ///   - Cast Custom Message Channel을 통해 JSON 메시지를 전송합니다.
  ///   - 리시버 앱에서 이 메시지를 받아 화면을 제어합니다.
  Future<void> sendMessage(Map<String, dynamic> message);

  /// TV에서 영상을 재생합니다.
  ///
  /// [videoUrl] : 재생할 영상 URL 또는 에셋 경로
  ///
  /// 실제 구현 시:
  ///   - MediaInfo 객체를 생성하고 RemoteMediaClient.load()로 전송합니다.
  ///   - URL은 TV에서 접근 가능한 http(s) URL이어야 합니다.
  ///     (로컬 assets/ 경로는 TV에서 직접 재생 불가)
  Future<void> playVideo(String videoUrl);

  /// 크롬캐스트 연결을 끊습니다.
  Future<void> disconnect();

  /// 현재 연결 상태 (true = 연결됨)
  bool get isConnected;

  /// 현재 연결된 기기 정보 (연결 안 됐으면 null)
  CastDevice? get connectedDevice;
}

// ============================================================
// MockCastService — 개발/테스트용 가짜 구현
//
// 실제 크롬캐스트 없이도 앱 흐름을 테스트할 수 있도록
// 모든 동작을 시뮬레이션합니다.
//
// ★ 실제 배포 전 GoogleCastService로 교체해야 합니다.
//   교체 방법: cast_provider.dart에서 Provider 주입 부분만 바꾸면 됩니다.
// ============================================================
class MockCastService implements CastService {
  bool _isConnected = false;
  CastDevice? _connectedDevice;

  @override
  bool get isConnected => _isConnected;

  @override
  CastDevice? get connectedDevice => _connectedDevice;

  /// 2초 대기 후 가상 TV 기기 목록을 반환합니다.
  /// (실제로는 Wi-Fi에서 기기를 탐색하는 부분)
  @override
  Future<List<CastDevice>> discoverDevices() async {
    await Future.delayed(const Duration(seconds: 2));
    return const [
      CastDevice(
        id: 'cast-device-001',
        name: '거실 TV',
        model: 'Chromecast with Google TV (4K)',
      ),
      CastDevice(
        id: 'cast-device-002',
        name: '침실 TV',
        model: 'Chromecast HD',
      ),
    ];
  }

  /// 1.2초 대기 후 연결 성공으로 처리합니다.
  /// (실제로는 Google Cast SDK로 TV에 Receiver 앱을 실행하는 부분)
  @override
  Future<bool> connect(CastDevice device, String sessionId) async {
    await Future.delayed(const Duration(milliseconds: 1200));
    _isConnected = true;
    _connectedDevice = device.copyWith(isConnected: true);
    return true;
  }

  /// 실제 구현: Cast Custom Message Channel로 TV 리시버에 메시지 전송
  @override
  Future<void> sendMessage(Map<String, dynamic> message) async {
    await Future.delayed(const Duration(milliseconds: 50));
  }

  /// 실제 구현: RemoteMediaClient.load(MediaInfo)로 TV에서 영상 재생
  @override
  Future<void> playVideo(String videoUrl) async {
    await Future.delayed(const Duration(milliseconds: 100));
  }

  @override
  Future<void> disconnect() async {
    _isConnected = false;
    _connectedDevice = null;
  }
}

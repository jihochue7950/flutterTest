import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/cast_service.dart';
import '../services/google_cast_service.dart';
import '../../../debug/debug_cast_service.dart';

// ============================================================
// 파일: cast_provider.dart
// 역할: 크롬캐스트 연결 상태를 관리하는 Riverpod Provider.
//
// ★ 핵심: 로컬(Mock) vs 운영(실제 Cast) 자동 전환
//
//   --dart-define-from-file=config/env.local.json  → DebugCastService (Mock)
//   --dart-define-from-file=config/env.prod.json   → GoogleCastService (실제)
//
//   env.local.json: "USE_REAL_CAST" 키 없음 → defaultValue: false → Mock
//   env.prod.json:  "USE_REAL_CAST": "true"  → true → 실제 Cast SDK
//
// ★ 크롬캐스트 전체 연결 흐름:
//
//   [Step 1] CastScreen 오픈 → discoverDevices() 자동 호출
//            ▶ 같은 Wi-Fi의 Chromecast 기기 탐색 시작 (약 2~5초)
//
//   [Step 2] 기기 목록 화면 표시 → 사용자가 TV 선택
//
//   [Step 3] connect(device, sessionId) 호출
//            ▶ TV에 Receiver 앱 실행
//            ▶ Cast 세션 시작
//            ▶ sessionId가 Receiver에 전달됨
//
//   [Step 4] 연결 완료 → markTvConnected() + sendInvite()
//            ▶ 백엔드에 TV 연결 완료 알림
//            ▶ User B에게 SMS 자동 발송
//
//   [Step 5] User B가 SMS 링크 접속 → AI 대화 (4 Q&A)
//
//   [Step 6] 4번째 답변 완료 → videoPlayRequested 이벤트
//            ▶ playVideo(url)로 TV에서 영상 재생
// ============================================================

// ──────────────────────────────────────────────────────────────
// 컴파일 타임 상수: 운영 모드 여부
//
// bool.fromEnvironment는 반드시 const로 선언해야 dart-define이 적용됨.
// 런타임에 결정되는 변수로 선언하면 항상 defaultValue(false)가 사용됨.
// ──────────────────────────────────────────────────────────────
const bool _kUseRealCast = bool.fromEnvironment(
  'USE_REAL_CAST',
  defaultValue: false, // 기본값: 로컬 Mock 모드
);

/// 크롬캐스트 연결 단계를 나타내는 열거형.
enum CastConnectionStatus {
  idle,        // 초기 대기 상태
  discovering, // Wi-Fi에서 기기 탐색 중
  connecting,  // 선택한 기기에 연결 시도 중
  connected,   // TV와 연결 완료 (캐스팅 가능)
  error,       // 탐색 또는 연결 실패
}

/// 크롬캐스트 관련 UI 상태를 담는 불변 클래스.
class CastState {
  /// 탐색으로 발견된 Chromecast 기기 목록
  final List<CastDevice> devices;

  /// 현재 연결 단계
  final CastConnectionStatus status;

  /// 현재 연결된 기기 정보 (연결 전은 null)
  final CastDevice? connectedDevice;

  /// 오류 메시지 (정상 상태는 null)
  final String? error;

  const CastState({
    this.devices = const [],
    this.status = CastConnectionStatus.idle,
    this.connectedDevice,
    this.error,
  });

  CastState copyWith({
    List<CastDevice>? devices,
    CastConnectionStatus? status,
    CastDevice? connectedDevice,
    String? error,
    bool clearError = false,
  }) =>
      CastState(
        devices: devices ?? this.devices,
        status: status ?? this.status,
        connectedDevice: connectedDevice ?? this.connectedDevice,
        error: clearError ? null : (error ?? this.error),
      );
}

/// 크롬캐스트 동작을 처리하는 StateNotifier.
class CastNotifier extends StateNotifier<CastState> {
  final CastService _service;

  CastNotifier(this._service) : super(const CastState());

  // ----------------------------------------------------------
  // [Step 1] 기기 탐색
  //   CastScreen이 처음 열릴 때 자동으로 호출됩니다.
  //
  //   Mock 모드  : 2초 후 가짜 기기 목록(거실 TV, 침실 TV) 반환
  //   실제 모드  : Google Cast SDK가 mDNS로 Wi-Fi 내 기기를 탐색
  //               같은 Wi-Fi에 연결된 Chromecast 기기만 표시됨
  // ----------------------------------------------------------
  Future<void> discoverDevices() async {
    state = state.copyWith(
      status: CastConnectionStatus.discovering,
      clearError: true,
    );
    try {
      final devices = await _service.discoverDevices();
      state = state.copyWith(
        devices: devices,
        status: CastConnectionStatus.idle,
      );
    } catch (e) {
      state = state.copyWith(
        status: CastConnectionStatus.error,
        error: '기기 검색 실패: $e',
      );
    }
  }

  // ----------------------------------------------------------
  // [Step 3] TV 연결
  //   사용자가 목록에서 TV를 선택했을 때 호출됩니다.
  //
  //   Mock 모드  : 1.2초 대기 후 연결 성공 처리
  //   실제 모드  : Google Cast SDK로 TV에 Receiver 앱 실행
  //               → TV 화면에 연결 화면 표시
  //               → 성공 시 true 반환
  //
  //   연결 성공 후 CastScreen에서:
  //   - markTvConnected() → 백엔드에 TV 연결 완료 알림
  //   - sendInvite()      → User B에게 SMS 자동 발송
  // ----------------------------------------------------------
  Future<bool> connect(CastDevice device, String sessionId) async {
    state = state.copyWith(
      status: CastConnectionStatus.connecting,
      clearError: true,
    );
    try {
      final success = await _service.connect(device, sessionId);
      state = state.copyWith(
        status: success
            ? CastConnectionStatus.connected
            : CastConnectionStatus.error,
        connectedDevice: success ? device.copyWith(isConnected: true) : null,
        error: success ? null : '연결에 실패했습니다.',
      );
      return success;
    } catch (e) {
      state = state.copyWith(
        status: CastConnectionStatus.error,
        error: '연결 오류: $e',
      );
      return false;
    }
  }

  /// 크롬캐스트 연결을 끊습니다.
  /// TV Receiver 앱이 종료됩니다.
  Future<void> disconnect() async {
    await _service.disconnect();
    state = state.copyWith(
      status: CastConnectionStatus.idle,
      connectedDevice: null,
    );
  }
}

// ============================================================
// Provider 설정 — 로컬/운영 자동 전환
//
// _kUseRealCast 값에 따라 다른 CastService 구현체를 주입합니다.
//
//   false (env.local.json) → DebugCastService
//     - 실제 Chromecast 없이 흐름 테스트 가능
//     - 모든 명령을 로그에 기록 (TestPanelScreen에서 확인 가능)
//
//   true  (env.prod.json)  → GoogleCastService
//     - 실제 Google Cast SDK와 통신
//     - Android/iOS 네이티브 코드 필요
//     - 실물 Chromecast 기기 또는 Chromecast 내장 TV 필요
// ============================================================
final castServiceProvider = Provider<CastService>((ref) {
  if (_kUseRealCast) {
    // 운영 모드: 실제 Google Cast SDK 사용
    // → lib/features/cast/services/google_cast_service.dart
    return GoogleCastService();
  }
  // 로컬/개발 모드: Mock + 로그 기록 서비스 사용
  // → lib/debug/debug_cast_service.dart
  return ref.watch(debugCastServiceProvider);
});

/// CastNotifier와 CastState를 앱 전체에 제공하는 Provider.
final castProvider =
    StateNotifierProvider<CastNotifier, CastState>((ref) {
  return CastNotifier(ref.watch(castServiceProvider));
});

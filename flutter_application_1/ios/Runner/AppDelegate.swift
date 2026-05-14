import Flutter
import UIKit
import GoogleCast

// ============================================================
// 파일: AppDelegate.swift
// 역할: iOS 앱의 진입점.
//       Google Cast SDK를 초기화하고 CastPlugin을 Flutter에 등록합니다.
//
// ★ 로컬 테스트 (env.local.json):
//   Flutter 쪽에서 MockCastService를 사용하므로
//   CastPlugin이 등록되어 있어도 실제로 호출되지 않습니다.
//   GCKCastContext 초기화는 실행되지만 기기 탐색을 하지 않으므로 무해.
//
// ★ 운영 (env.prod.json):
//   Flutter의 GoogleCastService가 MethodChannel로 CastPlugin을 호출합니다.
//   GCKCastContext를 통해 실제 Chromecast 기기와 통신합니다.
//
// ★ Cast SDK 초기화는 application(_:didFinishLaunchingWithOptions:)에서
//   반드시 최초 1회 수행해야 합니다.
// ============================================================

@main
@objc class AppDelegate: FlutterAppDelegate, FlutterImplicitEngineDelegate {

    override func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {

        // ──────────────────────────────────────────────────
        // Google Cast SDK 초기화
        //
        // GCKCastOptions: Cast 세션 설정
        //   - discoveryCriteria: 탐색할 Receiver 앱 ID 지정
        //   - CastPlugin.castAppId = kGCKDefaultMediaReceiverApplicationID
        //     ("CC1AD845"): Google 제공 기본 미디어 플레이어
        //
        // ★ 이 초기화는 앱 시작 즉시 백그라운드에서 Wi-Fi 기기 탐색을 시작합니다.
        // ★ 커스텀 Receiver 사용 시: CastPlugin.castAppId를 발급받은 ID로 변경.
        // ──────────────────────────────────────────────────
        let discoveryCriteria = GCKDiscoveryCriteria(
            applicationID: CastPlugin.castAppId
        )
        let castOptions = GCKCastOptions(
            discoveryCriteria: discoveryCriteria
        )
        // 로그 레벨 설정 (개발 중: verbose, 운영: none)
        GCKLogger.sharedInstance().delegate = self
        GCKCastContext.setSharedInstanceWith(castOptions)

        return super.application(application, didFinishLaunchingWithOptions: launchOptions)
    }

    // ----------------------------------------------------------
    // Flutter 엔진 초기화 완료 콜백
    // 여기서 CastPlugin을 Flutter 플러그인 시스템에 등록합니다.
    // ----------------------------------------------------------
    func didInitializeImplicitFlutterEngine(
        _ engineBridge: FlutterImplicitEngineBridge
    ) {
        // 기본 Flutter 플러그인 자동 등록 (pubspec.yaml의 패키지들)
        GeneratedPluginRegistrant.register(with: engineBridge.pluginRegistry)

        // CastPlugin 수동 등록
        // MethodChannel 이름: "com.example.flutter_application_1/cast"
        if let registrar = engineBridge.pluginRegistry.registrar(forPlugin: "CastPlugin") {
            CastPlugin.register(with: registrar)
        }
    }
}

// ──────────────────────────────────────────────────────────
// GCKLoggerDelegate: Cast SDK 로그 처리
// 개발 중 디버그 메시지를 콘솔에 출력합니다.
// ──────────────────────────────────────────────────────────
extension AppDelegate: GCKLoggerDelegate {
    func logMessage(
        _ message: String,
        at level: GCKLoggerLevel,
        fromFunction function: String,
        location: String
    ) {
        // 개발 빌드에서만 로그 출력 (운영 빌드에서는 주석 처리 권장)
        #if DEBUG
        print("[GCK][\(function)] \(message)")
        #endif
    }
}

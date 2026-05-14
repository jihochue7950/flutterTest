import Flutter
import UIKit
import GoogleCast

// ============================================================
// 파일: CastPlugin.swift
// 역할: Flutter의 MethodChannel 요청을 받아
//       실제 Google Cast SDK(GCK*)를 호출하는 iOS 네이티브 구현체.
//
// ★ 통신 방향:
//   Flutter(google_cast_service.dart)
//     ──[MethodChannel: com.example.flutter_application_1/cast]──▶
//   CastPlugin.swift (이 파일)
//     ──[Google Cast SDK]──▶
//   Chromecast 기기 (TV)
//
// ★ AppDelegate.swift에서 이 플러그인을 등록해야 동작합니다.
//
// ★ 지원 메서드 (Android CastPlugin.kt와 동일):
//   - discoverDevices : Wi-Fi의 Chromecast 기기 목록 반환
//   - connect         : 선택한 기기에 Cast 세션 시작
//   - playVideo       : TV에서 영상 URL 재생
//   - disconnect      : Cast 세션 종료
//   - isConnected     : 현재 연결 상태 반환
// ============================================================

class CastPlugin: NSObject, FlutterPlugin {

    // Flutter와 동일한 채널 이름이어야 함
    // (google_cast_service.dart의 MethodChannel 이름과 일치)
    static let channelName = "com.example.flutter_application_1/cast"

    // Default Media Receiver App ID (구글 제공 기본 플레이어)
    // 커스텀 Receiver 등록 시 이 값을 발급받은 ID로 교체하세요.
    static let castAppId = kGCKDefaultMediaReceiverApplicationID

    private var channel: FlutterMethodChannel?
    private var sessionManager: GCKSessionManager?

    // ----------------------------------------------------------
    // 플러그인 등록
    // AppDelegate.swift에서 호출하여 MethodChannel을 수립합니다.
    // ----------------------------------------------------------
    static func register(with registrar: FlutterPluginRegistrar) {
        let channel = FlutterMethodChannel(
            name: channelName,
            binaryMessenger: registrar.messenger()
        )
        let instance = CastPlugin()
        instance.channel = channel
        // GCKCastContext는 AppDelegate에서 초기화된 후 사용 가능
        instance.sessionManager = GCKCastContext.sharedInstance().sessionManager
        registrar.addMethodCallDelegate(instance, channel: channel)
    }

    // ----------------------------------------------------------
    // Flutter로부터 메서드 호출 수신
    // ----------------------------------------------------------
    func handle(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
        switch call.method {
        case "discoverDevices":
            discoverDevices(result: result)
        case "connect":
            connect(call: call, result: result)
        case "playVideo":
            playVideo(call: call, result: result)
        case "disconnect":
            disconnect(result: result)
        case "isConnected":
            result(isConnected())
        default:
            result(FlutterMethodNotImplemented)
        }
    }

    // ----------------------------------------------------------
    // 기기 탐색
    // GCKCastContext의 discoveryManager에서 발견된 기기 목록을 반환합니다.
    //
    // ★ Cast SDK는 앱 실행 직후부터 자동으로 Wi-Fi를 탐색합니다.
    //   처음 호출 시 목록이 비어있을 수 있습니다 (탐색 진행 중).
    // ----------------------------------------------------------
    private func discoverDevices(result: @escaping FlutterResult) {
        let discoveryManager = GCKCastContext.sharedInstance().discoveryManager
        var devices: [[String: String]] = []

        for i in 0..<discoveryManager.deviceCount {
            let device = discoveryManager.device(at: i)
            devices.append([
                "id"    : device.deviceID,
                "name"  : device.friendlyName ?? "Unknown",
                "model" : device.modelName    ?? "Chromecast",
            ])
        }

        result(devices)
    }

    // ----------------------------------------------------------
    // TV 연결
    // 선택한 기기 ID로 GCKCastSession을 시작합니다.
    //
    // 실제 동작:
    //   1. discoveryManager에서 deviceID로 GCKDevice를 찾음
    //   2. sessionManager.startSession(with:)으로 Cast 세션 시작
    //   3. TV 화면에 Receiver 앱이 실행됨
    // ----------------------------------------------------------
    private func connect(call: FlutterMethodCall, result: @escaping FlutterResult) {
        guard let args = call.arguments as? [String: Any],
              let deviceId = args["deviceId"] as? String else {
            result(FlutterError(
                code: "INVALID_ARG",
                message: "deviceId가 필요합니다",
                details: nil
            ))
            return
        }

        let discoveryManager = GCKCastContext.sharedInstance().discoveryManager

        // ID로 기기 찾기
        for i in 0..<discoveryManager.deviceCount {
            let device = discoveryManager.device(at: i)
            if device.deviceID == deviceId {
                sessionManager?.startSession(with: device)
                print("[CastPlugin] 연결 시작: \(device.friendlyName ?? deviceId)")
                result(true)
                return
            }
        }

        result(FlutterError(
            code: "DEVICE_NOT_FOUND",
            message: "기기를 찾을 수 없습니다: \(deviceId)",
            details: nil
        ))
    }

    // ----------------------------------------------------------
    // TV에서 영상 재생
    // GCKRemoteMediaClient로 TV에 영상 URL을 전달하고 재생합니다.
    //
    // ★ 중요: videoUrl은 반드시 https://로 시작하는 서버 URL이어야 합니다.
    //   Flutter assets 경로(assets/video/...)는 TV에서 접근 불가.
    //   반드시 CDN 또는 서버에 업로드된 URL 사용.
    //   예: "https://cdn.yourapp.com/videos/proposal.mp4"
    // ----------------------------------------------------------
    private func playVideo(call: FlutterMethodCall, result: @escaping FlutterResult) {
        guard let args = call.arguments as? [String: Any],
              let urlString = args["url"] as? String,
              let url = URL(string: urlString) else {
            result(FlutterError(
                code: "INVALID_ARG",
                message: "유효한 url이 필요합니다",
                details: nil
            ))
            return
        }

        guard let castSession = sessionManager?.currentCastSession,
              castSession.connectionState == .connected else {
            result(FlutterError(
                code: "NOT_CONNECTED",
                message: "Chromecast에 연결되지 않았습니다",
                details: nil
            ))
            return
        }

        // GCKMediaInformation: TV에서 재생할 미디어 정보
        let metadata = GCKMediaMetadata(metadataType: .movie)
        metadata.setString("특별한 영상", forKey: kGCKMetadataKeyTitle)

        guard let mediaInfo = GCKMediaInformationBuilder(contentURL: url)
            .build() as? GCKMediaInformation else {
            result(FlutterError(
                code: "BUILD_ERROR",
                message: "MediaInformation 생성 실패",
                details: nil
            ))
            return
        }

        // GCKMediaLoadOptions: 재생 옵션
        let options = GCKMediaLoadOptions()
        options.autoplay     = true // 로드 즉시 자동 재생
        options.playPosition = 0    // 처음부터 재생

        // TV에서 영상 로드 및 재생 시작
        castSession.remoteMediaClient?.loadMedia(mediaInfo, with: options)

        print("[CastPlugin] 영상 재생 요청: \(urlString)")
        result(nil)
    }

    // ----------------------------------------------------------
    // 연결 해제
    // GCKSessionManager로 Cast 세션을 종료합니다.
    // TV Receiver 앱이 닫힙니다.
    // ----------------------------------------------------------
    private func disconnect(result: @escaping FlutterResult) {
        // true: Receiver 앱도 함께 종료
        sessionManager?.endSessionAndStopCasting(true)
        print("[CastPlugin] Cast 연결 해제")
        result(nil)
    }

    /** 현재 Cast 세션 연결 상태를 반환합니다. */
    private func isConnected() -> Bool {
        return sessionManager?.currentCastSession?.connectionState == .connected
    }
}

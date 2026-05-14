package com.example.flutter_application_1

import android.content.Context
import android.util.Log
import com.google.android.gms.cast.MediaInfo
import com.google.android.gms.cast.MediaLoadOptions
import com.google.android.gms.cast.MediaMetadata
import com.google.android.gms.cast.framework.CastContext
import com.google.android.gms.cast.framework.CastSession
import com.google.android.gms.cast.framework.SessionManagerListener
import io.flutter.plugin.common.BinaryMessenger
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel

// ============================================================
// 파일: CastPlugin.kt
// 역할: Flutter의 MethodChannel 요청을 받아
//       실제 Google Cast SDK를 호출하는 네이티브 구현체.
//
// ★ 통신 방향:
//   Flutter(google_cast_service.dart)
//     ──[MethodChannel: com.example.flutter_application_1/cast]──▶
//   CastPlugin.kt (이 파일)
//     ──[Google Cast SDK]──▶
//   Chromecast 기기 (TV)
//
// ★ 지원 메서드:
//   - discoverDevices : Wi-Fi의 Chromecast 기기 목록 반환
//   - connect         : 선택한 기기에 Cast 세션 시작
//   - playVideo       : TV에서 영상 URL 재생
//   - disconnect      : Cast 세션 종료
//   - isConnected     : 현재 연결 상태 반환
// ============================================================

class CastPlugin(private val context: Context) : MethodChannel.MethodCallHandler {

    companion object {
        // Flutter와 동일한 채널 이름이어야 함
        // (google_cast_service.dart의 MethodChannel 이름과 일치)
        const val CHANNEL = "com.example.flutter_application_1/cast"
        private const val TAG = "CastPlugin"
    }

    private var channel: MethodChannel? = null
    private var castContext: CastContext? = null

    // Cast 세션 상태 변화를 감지하는 리스너
    private val sessionManagerListener = object : SessionManagerListener<CastSession> {
        override fun onSessionStarted(session: CastSession, sessionId: String) {
            Log.d(TAG, "Cast 세션 시작됨: $sessionId")
            // 세션 시작 시 Flutter에 알릴 수 있음 (필요 시 EventChannel로 확장)
        }

        override fun onSessionEnded(session: CastSession, error: Int) {
            Log.d(TAG, "Cast 세션 종료됨 (error: $error)")
        }

        override fun onSessionResumed(session: CastSession, wasSuspended: Boolean) {
            Log.d(TAG, "Cast 세션 재개됨")
        }

        override fun onSessionStartFailed(session: CastSession, error: Int) {
            Log.e(TAG, "Cast 세션 시작 실패 (error: $error)")
        }

        override fun onSessionEndFailed(session: CastSession, error: Int) {
            Log.e(TAG, "Cast 세션 종료 실패 (error: $error)")
        }

        override fun onSessionStarting(session: CastSession) {}
        override fun onSessionEnding(session: CastSession) {}
        override fun onSessionResuming(session: CastSession, sessionId: String) {}
        override fun onSessionResumeFailed(session: CastSession, error: Int) {}
        override fun onSessionSuspended(session: CastSession, reason: Int) {}
    }

    /**
     * MainActivity에서 호출되어 MethodChannel을 등록하고 Cast SDK를 초기화합니다.
     */
    fun register(messenger: BinaryMessenger) {
        channel = MethodChannel(messenger, CHANNEL)
        channel?.setMethodCallHandler(this)
        initCastContext()
    }

    /**
     * Google Cast SDK (CastContext)를 초기화합니다.
     *
     * 초기화 실패 원인:
     * - Google Play Services가 기기에 없거나 버전이 낮은 경우
     * - AndroidManifest.xml에 CastOptionsProvider 등록이 누락된 경우
     */
    private fun initCastContext() {
        try {
            castContext = CastContext.getSharedInstance(context)

            // 세션 상태 변화 감지 리스너 등록
            castContext?.sessionManager?.addSessionManagerListener(
                sessionManagerListener,
                CastSession::class.java
            )

            Log.d(TAG, "CastContext 초기화 완료. App ID: ${CastOptionsProvider.CAST_APP_ID}")
        } catch (e: Exception) {
            Log.e(TAG, "CastContext 초기화 실패: ${e.message}")
            // Google Play Services 없는 기기(일부 중국 폰 등)에서 발생 가능
            // 앱은 계속 실행되지만 Cast 기능은 비활성화됨
        }
    }

    override fun onMethodCall(call: MethodCall, result: MethodChannel.Result) {
        // Cast SDK가 초기화되지 않은 경우
        if (castContext == null) {
            result.error("CAST_UNAVAILABLE", "Cast SDK를 사용할 수 없습니다.", null)
            return
        }

        when (call.method) {
            "discoverDevices" -> discoverDevices(result)
            "connect"         -> connect(call, result)
            "playVideo"       -> playVideo(call, result)
            "disconnect"      -> disconnect(result)
            "isConnected"     -> result.success(isConnected())
            else              -> result.notImplemented()
        }
    }

    // ----------------------------------------------------------
    // 기기 탐색
    // Cast SDK가 백그라운드에서 자동으로 탐색한 기기 목록을 반환합니다.
    //
    // ★ Cast SDK는 앱 실행 직후부터 백그라운드에서 mDNS로 기기를 탐색합니다.
    //   이 메서드는 그 결과를 읽어서 반환할 뿐입니다.
    //   따라서 처음 호출 시 목록이 비어있을 수 있습니다 (탐색 중이라면).
    // ----------------------------------------------------------
    private fun discoverDevices(result: MethodChannel.Result) {
        try {
            val discoveryManager = castContext?.discoveryManager
            val deviceCount = discoveryManager?.deviceCount ?: 0
            val devices = mutableListOf<Map<String, String>>()

            for (i in 0 until deviceCount) {
                val device = discoveryManager?.getDeviceAtIndex(i) ?: continue
                devices.add(
                    mapOf(
                        "id"    to device.deviceId,
                        "name"  to (device.friendlyName ?: "Unknown"),
                        "model" to (device.modelName   ?: "Chromecast"),
                    )
                )
            }

            Log.d(TAG, "발견된 기기: ${devices.size}개")
            result.success(devices)
        } catch (e: Exception) {
            Log.e(TAG, "기기 탐색 오류: ${e.message}")
            result.error("DISCOVER_ERROR", "기기 탐색 실패: ${e.message}", null)
        }
    }

    // ----------------------------------------------------------
    // TV 연결
    // 선택한 기기에 Cast 세션을 시작합니다.
    //
    // 실제 동작:
    //   1. 기기 ID로 CastDevice 객체를 찾음
    //   2. SessionManager.startSession()으로 Cast 세션 시작
    //   3. TV 화면에 Receiver 앱(CastOptionsProvider.CAST_APP_ID)이 실행됨
    //   4. Receiver와 Custom Message Channel 수립
    // ----------------------------------------------------------
    private fun connect(call: MethodCall, result: MethodChannel.Result) {
        val deviceId  = call.argument<String>("deviceId")  ?: run {
            result.error("INVALID_ARG", "deviceId가 필요합니다", null)
            return
        }
        val sessionId = call.argument<String>("sessionId") ?: ""

        try {
            val discoveryManager = castContext?.discoveryManager
            val deviceCount = discoveryManager?.deviceCount ?: 0
            var targetDevice: com.google.android.gms.cast.framework.media.RemoteMediaClient? = null

            // ID로 기기 찾기
            for (i in 0 until deviceCount) {
                val device = discoveryManager?.getDeviceAtIndex(i) ?: continue
                if (device.deviceId == deviceId) {
                    // 찾은 기기로 세션 시작
                    castContext?.sessionManager?.startSession(device)
                    Log.d(TAG, "Cast 연결 시작: ${device.friendlyName}, sessionId: $sessionId")
                    result.success(true)
                    return
                }
            }

            // 기기를 찾지 못한 경우
            Log.w(TAG, "기기를 찾을 수 없음: $deviceId")
            result.error("DEVICE_NOT_FOUND", "기기를 찾을 수 없습니다: $deviceId", null)
        } catch (e: Exception) {
            Log.e(TAG, "연결 오류: ${e.message}")
            result.error("CONNECT_ERROR", "연결 실패: ${e.message}", null)
        }
    }

    // ----------------------------------------------------------
    // TV에서 영상 재생
    // RemoteMediaClient를 통해 TV에 영상 URL을 전달하고 재생합니다.
    //
    // ★ 중요: videoUrl은 반드시 http(s)로 시작하는 서버 URL이어야 합니다.
    //   Flutter assets 경로(assets/video/...)는 TV에서 접근 불가.
    //   반드시 CDN 또는 서버에 업로드된 URL 사용.
    //   예: "https://cdn.yourapp.com/videos/proposal.mp4"
    // ----------------------------------------------------------
    private fun playVideo(call: MethodCall, result: MethodChannel.Result) {
        val url = call.argument<String>("url") ?: run {
            result.error("INVALID_ARG", "url이 필요합니다", null)
            return
        }

        try {
            val castSession = castContext?.sessionManager?.currentCastSession
            if (castSession == null || !castSession.isConnected) {
                result.error("NOT_CONNECTED", "Chromecast에 연결되지 않았습니다", null)
                return
            }

            // MediaInfo: TV에서 재생할 미디어 정보
            val mediaInfo = MediaInfo.Builder(url)
                .setStreamType(MediaInfo.STREAM_TYPE_BUFFERED) // VOD 스트림
                .setContentType("video/mp4")                   // MIME 타입
                .setMetadata(
                    MediaMetadata(MediaMetadata.MEDIA_TYPE_MOVIE).apply {
                        putString(MediaMetadata.KEY_TITLE, "특별한 영상")
                    }
                )
                .build()

            // MediaLoadOptions: 재생 옵션
            val loadOptions = MediaLoadOptions.Builder()
                .setAutoplay(true)    // 로드 즉시 자동 재생
                .setPlayPosition(0)   // 처음부터 재생
                .build()

            // RemoteMediaClient: TV에서 미디어를 제어하는 객체
            castSession.remoteMediaClient?.load(mediaInfo, loadOptions)

            Log.d(TAG, "영상 재생 요청: $url")
            result.success(null)
        } catch (e: Exception) {
            Log.e(TAG, "영상 재생 오류: ${e.message}")
            result.error("PLAY_ERROR", "영상 재생 실패: ${e.message}", null)
        }
    }

    // ----------------------------------------------------------
    // 연결 해제
    // Cast 세션을 종료하고 TV Receiver 앱을 닫습니다.
    // ----------------------------------------------------------
    private fun disconnect(result: MethodChannel.Result) {
        try {
            // endCurrentSession(true): true면 Receiver 앱도 함께 종료
            castContext?.sessionManager?.endCurrentSession(true)
            Log.d(TAG, "Cast 연결 해제")
            result.success(null)
        } catch (e: Exception) {
            Log.e(TAG, "연결 해제 오류: ${e.message}")
            result.error("DISCONNECT_ERROR", "연결 해제 실패: ${e.message}", null)
        }
    }

    /** 현재 Cast 세션 연결 상태를 반환합니다. */
    private fun isConnected(): Boolean {
        return castContext?.sessionManager?.currentCastSession?.isConnected == true
    }

    /**
     * 리소스를 해제합니다.
     * MainActivity.onDestroy()에서 호출됩니다.
     */
    fun dispose() {
        try {
            castContext?.sessionManager?.removeSessionManagerListener(
                sessionManagerListener,
                CastSession::class.java
            )
        } catch (_: Exception) {}
        channel?.setMethodCallHandler(null)
        channel = null
    }
}

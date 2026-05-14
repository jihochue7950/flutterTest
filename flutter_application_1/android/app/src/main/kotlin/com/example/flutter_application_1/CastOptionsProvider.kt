package com.example.flutter_application_1

import android.content.Context
import com.google.android.gms.cast.framework.CastOptions
import com.google.android.gms.cast.framework.OptionsProvider
import com.google.android.gms.cast.framework.SessionProvider

// ============================================================
// 파일: CastOptionsProvider.kt
// 역할: Google Cast SDK가 앱 시작 시 자동으로 찾아 사용하는
//       Cast 설정 클래스입니다.
//
// ★ AndroidManifest.xml에 이 클래스를 등록해야 Cast SDK가 초기화됩니다.
//   <meta-data
//     android:name="com.google.android.gms.cast.framework.OPTIONS_PROVIDER_CLASS_NAME"
//     android:value="com.example.flutter_application_1.CastOptionsProvider" />
//
// ★ CAST_APP_ID 설명:
//   - "CC1AD845" = Default Media Receiver (구글 제공 기본 플레이어)
//     → 별도 등록 없이 바로 사용 가능
//     → 기본 플레이어 UI로 영상 재생
//
//   - 커스텀 Receiver가 필요한 경우:
//     1. https://cast.google.com/publish 에서 앱 등록
//     2. 발급받은 Application ID로 교체
//     3. TV에서 실행될 Receiver HTML/JS 앱 개발 및 호스팅 필요
// ============================================================

class CastOptionsProvider : OptionsProvider {

    companion object {
        // Default Media Receiver App ID
        // 커스텀 Receiver 등록 시 이 값을 발급받은 ID로 교체하세요.
        const val CAST_APP_ID = "CC1AD845"
    }

    /**
     * Cast SDK 옵션을 반환합니다.
     * 앱 시작 시 CastContext 초기화에 사용됩니다.
     */
    override fun getCastOptions(context: Context): CastOptions {
        return CastOptions.Builder()
            // Receiver 앱 ID 설정
            // TV에서 이 ID의 Receiver 앱이 실행됩니다.
            .setReceiverApplicationId(CAST_APP_ID)
            // Cast 버튼을 ActionBar에 자동으로 추가 (Flutter에서는 사용 안 하므로 false)
            .setStopSelfOnTaskRemoved(true)
            .build()
    }

    /**
     * 추가 세션 제공자 (필요한 경우에만 사용, 일반적으로 null 반환)
     */
    override fun getAdditionalSessionProviders(
        context: Context
    ): List<SessionProvider>? = null
}

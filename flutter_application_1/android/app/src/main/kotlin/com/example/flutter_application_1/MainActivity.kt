package com.example.flutter_application_1

import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine

// ============================================================
// 파일: MainActivity.kt
// 역할: Flutter 앱의 Android 진입점.
//       CastPlugin을 등록하여 Flutter ↔ Cast SDK 통신을 활성화합니다.
//
// ★ 로컬 테스트 (env.local.json):
//   Flutter 쪽에서 MockCastService를 사용하므로
//   CastPlugin이 등록되어 있어도 실제로 호출되지 않습니다.
//
// ★ 운영 (env.prod.json):
//   Flutter의 GoogleCastService가 MethodChannel로 CastPlugin을 호출합니다.
//   CastPlugin이 실제 Google Cast SDK와 통신합니다.
// ============================================================

class MainActivity : FlutterActivity() {

    // CastPlugin 인스턴스 (dispose를 위해 보관)
    private var castPlugin: CastPlugin? = null

    /**
     * Flutter 엔진이 준비됐을 때 호출됩니다.
     * 여기서 MethodChannel 기반 플러그인들을 등록합니다.
     */
    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        // CastPlugin 등록
        // Flutter ↔ Android 간 MethodChannel 통신 채널을 수립합니다.
        castPlugin = CastPlugin(this).also { plugin ->
            plugin.register(flutterEngine.dartExecutor.binaryMessenger)
        }
    }

    /**
     * Activity가 파괴될 때 리소스를 해제합니다.
     */
    override fun onDestroy() {
        castPlugin?.dispose()
        castPlugin = null
        super.onDestroy()
    }
}

// ============================================================
// Android 앱 빌드 설정
// ============================================================
plugins {
    id("com.android.application")
    id("kotlin-android")
    id("dev.flutter.flutter-gradle-plugin")
}

android {
    namespace = "com.example.flutter_application_1"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_17.toString()
    }

    defaultConfig {
        applicationId = "com.example.flutter_application_1"
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    buildTypes {
        release {
            // 실제 배포 시 signingConfig를 release용으로 변경 필요
            signingConfig = signingConfigs.getByName("debug")
        }
    }
}

dependencies {
    // ──────────────────────────────────────────────────────
    // Google Cast SDK (Chromecast 실제 연동에 필요)
    //
    // ★ 로컬(env.local.json) 실행 시: Mock 서비스를 사용하므로
    //   이 라이브러리 코드가 실제로 호출되지 않습니다.
    //   단, 컴파일은 되어야 하므로 항상 포함시킵니다.
    //
    // ★ 운영(env.prod.json) 실행 시: CastPlugin.kt가 이 SDK를
    //   사용하여 실제 Chromecast 기기와 통신합니다.
    //
    // ★ 버전 업데이트 시: https://developers.google.com/cast/docs/android_sender
    //   에서 최신 버전 확인 후 교체하세요.
    // ──────────────────────────────────────────────────────
    implementation("com.google.android.gms:play-services-cast-framework:21.4.0")

    // AndroidX 호환성 (Flutter에서 기본 포함되지만 명시적으로 추가)
    implementation("androidx.core:core-ktx:1.12.0")
}

flutter {
    source = "../.."
}

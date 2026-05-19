# Cast/TV Agent

- **소속 팀**: Team A — Flutter App
- **담당 파일**: `flutter_application_1/lib/features/cast/`

---

## 1. 역할 목적

Chromecast 기기 탐색, 연결, TV 화면 제어를 전담합니다.  
현재 `MockCastService`(가짜 구현)를 `GoogleCastService`(실제 Google Cast SDK)로 교체하는 것이 핵심 목표입니다.

---

## 2. 담당 범위

| 분류 | 경로 |
|---|---|
| 인터페이스 정의 | `features/cast/services/cast_service.dart` |
| 실제 구현 (예정) | `features/cast/services/google_cast_service.dart` |
| 상태 관리 | `features/cast/providers/cast_provider.dart` |
| Cast 화면 | `features/cast/screens/cast_screen.dart` |
| 로컬 영상 재생 | `features/cast/screens/local_video_player_screen.dart` |

---

## 3. 하지 말아야 할 일

- AI 대화 흐름(`avatar_provider.dart`) 수정
- SMS 발송 로직 수정
- `session_provider.dart` 비즈니스 로직 수정
- Cast SDK 없이 `GoogleCastService`를 완성된 것처럼 처리

---

## 4. 입력받아야 하는 정보

| 출처 | 정보 |
|---|---|
| AI Flow Agent | `videoPlayRequested` 이벤트 payload (`videoUrl`) |
| Backend/API Agent | `session.videoUrl` — DB에서 조회된 실제 영상 URL |
| PM Agent | Google Cast Developer Console Application ID |
| DevOps/Build Agent | iOS Podfile에 Google Cast SDK 추가 여부 |

---

## 5. 산출물

- `GoogleCastService` — 실제 Google Cast SDK 연동 구현체
- Cast 기기 탐색 → 연결 → 영상 재생 E2E 동작
- `cast_service.dart` 인터페이스 최신 유지
- 하드웨어 없는 환경에서는 `MockCastService` 유지

---

## 6. 체크리스트

### 준비 단계 (하드웨어 필요)
- [ ] Chromecast 동글 또는 Google TV 확보
- [ ] Google Cast Developer Console에서 앱 등록 → Application ID 발급
- [ ] Flutter 앱과 Chromecast가 **동일 Wi-Fi** 네트워크 연결 확인

### 구현 단계
- [ ] `google_cast_service.dart`에 `CastService` 인터페이스 구현
- [ ] `discoverDevices()` — mDNS 기기 탐색 동작 확인
- [ ] `connect(device, sessionId)` — CastSession 시작 + Receiver 앱 실행
- [ ] `playVideo(videoUrl)` — `RemoteMediaClient.load()` 동작 확인
- [ ] `sendMessage()` — Custom Message Channel 동작 확인
- [ ] `cast_provider.dart`에서 `MockCastService` → `GoogleCastService` 주입 전환
- [ ] TV에서 `session.videoUrl`(DB 기반 URL)로 영상 재생 확인

---

## 7. 다른 에이전트와 협업 포인트

| 에이전트 | 협업 내용 |
|---|---|
| Flutter Developer Agent | `CastService` 인터페이스 변경 시 `cast_screen.dart` 함께 업데이트 |
| AI Flow Agent | `videoPlayRequested` 이벤트 수신 → `playVideo()` 호출 타이밍 |
| Backend/API Agent | DB에서 가져온 `videoUrl`이 TV에서 접근 가능한 HTTP URL인지 확인 |
| QA/QC Agent | Cast 연결 실패, 영상 재생 실패 시나리오 테스트 케이스 제공 |

---

## 현재 상태 정리

```
현재:  MockCastService (가짜 구현 — 2초 대기 후 연결 성공 시뮬레이션)
목표:  GoogleCastService (실제 Google Cast SDK 연동)

교체 지점: cast_provider.dart
  현재: final castService = MockCastService();
  목표: final castService = GoogleCastService();  // USE_REAL_CAST=true 시
```

> `config/env.prod.json`의 `USE_REAL_CAST` 플래그로 환경별 전환 관리 예정.

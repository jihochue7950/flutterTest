# Flutter Developer Agent

- **소속 팀**: Team A — Flutter App
- **담당 파일**: `flutter_application_1/lib/` 전체

---

## 1. 역할 목적

Flutter 앱의 UI, 화면 흐름, 상태 관리를 전담합니다.  
Host(세션 생성자)와 User B(초대받은 사람) 모두가 사용하는 화면을 구현하고 유지합니다.

---

## 2. 담당 범위

| 분류 | 경로 |
|---|---|
| 앱 진입점 | `lib/main.dart`, `lib/app.dart` |
| 라우팅 | `lib/core/router/app_router.dart` |
| 설정 | `lib/core/config/app_config.dart` |
| 네트워크 | `lib/core/network/api_client.dart`, `websocket_service.dart` |
| 모델 | `lib/core/models/` (session_model, event_model, video_model) |
| 기능 화면 | `lib/features/session/`, `features/control/`, `features/invite/`, `features/video/` |
| 공통 위젯 | `lib/shared/` |
| 환경변수 | `config/env.*.json` |

---

## 3. 하지 말아야 할 일

- `server/` Node.js 코드 수정
- `ai_proposal_system/` 코드 수정
- API 엔드포인트 URL을 코드 내 하드코딩 (반드시 `AppConfig` 경유)
- Solapi 키 등 민감 정보를 Dart 코드 내 하드코딩
- iOS 서명 설정(`project.pbxproj`) 직접 수정

---

## 4. 입력받아야 하는 정보

| 출처 | 정보 |
|---|---|
| Team B (Backend/API Agent) | REST API 엔드포인트 명세, 요청/응답 형식 |
| Team B (AI Flow Agent) | WebSocket 이벤트 타입 및 payload 형식 |
| Team A (Cast/TV Agent) | CastService 인터페이스 변경 사항 |
| DevOps/Build Agent | 환경변수 키 이름, 빌드 명령 |
| PM Agent | 우선순위, Phase 목표 |

---

## 5. 산출물

- 완성된 Flutter 화면 (Riverpod 상태 연동)
- `SessionModel`, `EventModel` 등 최신 모델 클래스
- `api_client.dart` — REST 호출 래퍼
- `websocket_service.dart` — WebSocket 연결 관리
- 로컬/AWS/프로덕션 환경별 `config/env.*.json`

---

## 6. 체크리스트

- [ ] `SessionCreateScreen`: userCode 입력 → `createSession()` 정상 호출
- [ ] `SessionShellScreen`: Cast / Control / Test 탭 전환 정상 동작
- [ ] `AiAvatarScreen`: WebSocket 연결 후 TTS 음성 출력
- [ ] `InviteScreen`: 초대 토큰으로 세션 조회 및 WebSocket 연결
- [ ] `video_upload_screen.dart` 미완성 여부 확인 및 처리
- [ ] `debug/` 패널을 프로덕션 빌드에서 제외 처리
- [ ] `env.prod.json` Solapi 키 제거 완료 확인

---

## 7. 다른 에이전트와 협업 포인트

| 에이전트 | 협업 내용 |
|---|---|
| Cast/TV Agent | `CastService` 추상 인터페이스 변경 시 사전 합의 |
| Backend/API Agent | API 응답 형식 변경 시 `SessionModel.fromJson()` 함께 업데이트 |
| AI Flow Agent | `EventType` enum 추가/변경 시 `event_model.dart` 동기화 |
| QA/QC Agent | 화면별 테스트 시나리오 제공 |
| DevOps/Build Agent | 새 환경변수 추가 시 `app_config.dart`와 `env.*.json` 동시 반영 |

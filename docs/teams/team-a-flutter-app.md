# Team A — Flutter App

## 개요

| 항목 | 내용 |
|---|---|
| 담당 디렉토리 | `flutter_application_1/` |
| 소속 에이전트 | Flutter Developer, Cast/TV |
| 주 플랫폼 | iOS (Release 빌드, 실기기 설치) |
| 서버 의존 | Team B `server.js` (port 3000) |
| 직접 DB 접근 | 없음 (모든 데이터는 Team B API 경유) |

---

## 시스템 내 위치

```
[Team A: Flutter App]
        │
        │  REST API + WebSocket
        ▼
[Team B: Core Server]  →  [Team C: Admin System]
```

Team A는 최종 사용자(Host, User B)가 직접 접하는 유일한 클라이언트입니다.  
Team C 관리자 시스템과는 직접 통신하지 않으며, **반드시 Team B를 경유**합니다.

---

## 기술 스택

| 분류 | 기술 |
|---|---|
| 프레임워크 | Flutter 3.41.9 (Dart 3.11.5) |
| 상태 관리 | flutter_riverpod 2.5.1 |
| 라우팅 | go_router 14.0.0 |
| 네트워크 | http 1.2.0, web_socket_channel 2.4.0 |
| AI 음성 | flutter_tts 4.0.2 (TTS), speech_to_text 6.6.2 (STT) |
| Cast | cast_service.dart (현재 MockCastService) → GoogleCastService 예정 |
| 빌드 환경 | `--dart-define-from-file=config/env.prod.json` |

---

## 화면 구조 (go_router 기준)

```
/                          → HomeScreen
/session/create            → SessionCreateScreen   (userCode, 전화번호 입력)
/session/:sessionId        → SessionShellScreen     (Cast + Control + Test 탭)
/session/:sessionId/avatar → AiAvatarScreen          (TV 전체화면 AI 아바타)
/invite/:token             → InviteScreen            (User B 접속 화면)
```

---

## 주요 미결 과제

| 우선순위 | 과제 | 담당 에이전트 |
|---|---|---|
| 🔴 HIGH | MockCastService → GoogleCastService 실제 구현 | Cast/TV |
| 🟡 MID | video_upload_screen.dart 완성도 검증 | Flutter Developer |
| 🟡 MID | debug/ 패널 프로덕션 제거 여부 결정 | Flutter Developer |
| 🟢 LOW | AiAvatarScreen 브라우저 자동재생 정책 대응 강화 | Flutter Developer |

---

## 외부 인터페이스 (읽기 전용 계약)

Team A가 소비하는 API는 `docs/shared/api-contracts.md` 에 명시됩니다.  
Team A는 이 계약을 **읽기만** 하며, 서버 엔드포인트를 임의로 변경하지 않습니다.

---

## 팀 경계 규칙

- `server/` 코드를 수정하지 않습니다.
- `ai_proposal_system/` 코드를 수정하지 않습니다.
- API 엔드포인트 변경이 필요할 경우 Team B에 요청합니다.
- 환경변수(`config/env.*.json`) 추가/변경 시 DevOps/Build Agent와 협의합니다.

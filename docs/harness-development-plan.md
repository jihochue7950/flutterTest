# Harness Development Plan — FLUTTERPROJECT

---

## 1. 프로젝트 개요

AI 기반 결혼 프로포즈 경험 앱.  
Host가 상대방(User B)에게 SMS로 초대장을 보내면, User B는 링크로 접속해 AI와 대화하고, TV 화면에서 특별한 영상이 재생됩니다.

---

## 2. 전체 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FLUTTERPROJECT                              │
│                                                                     │
│  ┌──────────────────────┐                                           │
│  │  Team A: Flutter App │                                           │
│  │  flutter_application_1/                                          │
│  │                      │  REST API (port 3000)                     │
│  │  - Host 앱 (iOS)     │ ─────────────────────────────▶           │
│  │  - User B 초대 화면  │  WebSocket (port 3000)                   │
│  │  - TV AI 아바타      │ ◀─────────────────────────────           │
│  └──────────────────────┘                                           │
│                                    ▼                                │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Team B: Core Server                                          │  │
│  │  server/server.js (port 3000/4000, EC2, PM2)                 │  │
│  │                                                               │  │
│  │  - 세션 관리 (인메모리)                                        │  │
│  │  - WebSocket 이벤트 브로드캐스트                               │  │
│  │  - Solapi SMS 발송                                            │  │
│  │  - AI 대화 흐름 오케스트레이션                                  │  │
│  │  - proposal-data 조회 (Team C API 호출)                       │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                    │                                │
│                      GET /api/users/:userCode/proposal-data         │
│                                    │ (port 8080)                    │
│                                    ▼                                │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Team C: Admin System                                         │  │
│  │  ai_proposal_system/ (port 8080, EC2, PM2)                   │  │
│  │                                                               │  │
│  │  admin-server:                                                │  │
│  │  - Express REST API + JWT 인증                                │  │
│  │  - MariaDB (users, user_videos, ai_questions)                 │  │
│  │  - 영상 파일 업로드/서빙                                       │  │
│  │                                                               │  │
│  │  admin-client (React):                                        │  │
│  │  - 관리자 로그인                                               │  │
│  │  - 사용자/영상/질문 CRUD                                      │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. 에이전트 구조

```
FLUTTERPROJECT
│
├── Team A: Flutter App
│   ├── Flutter Developer Agent   (lib/ 전체)
│   └── Cast/TV Agent             (Chromecast 연동)
│
├── Team B: Core Server
│   ├── Backend/API Agent         (server.js REST/WS)
│   └── AI Flow Agent             (대화 흐름, 이벤트)
│
├── Team C: Admin System
│   ├── Admin Backend Agent       (Express, MariaDB)
│   └── Admin Frontend Agent      (React 대시보드)
│
└── Cross-Team
    ├── PM Agent                  (전팀 조율, Phase 관리)
    ├── QA/QC Agent               (E2E 테스트)
    ├── DevOps/Build Agent        (빌드, 배포, 환경변수)
    └── Security Agent            (보안 점검)
```

---

## 4. Harness 개발 방식 규칙

### 팀 경계 원칙
- 각 팀은 자신의 디렉토리만 수정합니다.
- 다른 팀의 코드가 필요하면 **API 계약서를 통해 요청**합니다.
- 계약서(`api-contracts.md`, `websocket-event-contracts.md`)는 변경 전 전팀 합의 필수.

### Phase 게이팅
- 각 Phase는 PM Agent의 게이팅 조건 확인 후 다음 Phase로 진행합니다.
- 게이팅 조건은 `docs/timeline.md`에 명시됩니다.

### 에이전트 호출 규칙
- 에이전트는 자신의 담당 범위 외 코드를 수정하지 않습니다.
- 블로커 발생 시 즉시 PM Agent에 보고합니다.
- 계약서 변경은 작업 전에 합의하고, 작업 후 문서를 업데이트합니다.

---

## 5. 현재 알려진 기술 부채

| 항목 | 팀 | 우선순위 |
|---|---|---|
| `QUESTIONS` 하드코딩 | Team B | 🔴 HIGH — Phase 3에서 해소됨 |
| `MockCastService` | Team A | 🔴 HIGH — Phase 5에서 해소 예정 |
| admins bcrypt 플레이스홀더 | Team C | 🔴 HIGH |
| Solapi 키 env 파일 잔존 | Cross | 🔴 HIGH — Phase 0에서 해소됨 |
| 서버 API 인증 없음 | Team B | 🟡 MID |
| 전화번호 로그 마스킹 | Team B | 🟡 MID |
| HTTPS 미적용 | Cross | 🟡 MID |
| `video_upload_screen` 미완성 | Team A | 🟡 MID |
| `debug/` 패널 프로덕션 제거 | Team A | 🟢 LOW |

---

## 6. 데이터 흐름 요약

```
1. [관리자] admin-client에서 userCode 생성, 영상 업로드, 질문 4개 등록
        ↓
2. [Host] Flutter 앱에서 userCode 입력 + 상대방 전화번호 입력
        ↓
3. [Team B] POST /sessions + userCode → Team C에서 영상URL/질문 조회
        ↓
4. [Host] Chromecast 연결 → TV에 AiAvatarScreen 실행
        ↓
5. [Host] "초대 발송" → Team B가 Solapi SMS 발송
        ↓
6. [User B] SMS 링크 클릭 → InviteScreen 접속
        ↓
7. [Team B] userBJoined → 질문 1 aiSpeech 브로드캐스트
        ↓
8. [TV] TTS 재생 → aiListening → [User B] 답변 입력
        ↓
9. [반복] 질문 N개 완료까지
        ↓
10. [Team B] videoPlayRequested { videoUrl: DB 기반 URL }
        ↓
11. [TV] 영상 재생 💍
```

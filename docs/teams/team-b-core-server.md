# Team B — Core Server

## 개요

| 항목 | 내용 |
|---|---|
| 담당 디렉토리 | `server/` |
| 소속 에이전트 | Backend/API, AI Flow |
| 주 런타임 | Node.js (PM2, AWS EC2) |
| 포트 | 3000 (API + WebSocket), 4000 (User B 초대 페이지) |
| 상위 소비자 | Team A Flutter 앱 |
| 하위 의존 | Team C admin-server (port 8080) |

---

## 시스템 내 위치

```
[Team A: Flutter App]
        │  REST/WebSocket (port 3000)
        ▼
[Team B: Core Server]  ◀─ 핵심 오케스트레이터
        │  GET /api/users/:userCode/proposal-data
        ▼
[Team C: Admin System (port 8080)]
```

Team B는 프로젝트의 **런타임 오케스트레이터**입니다.  
세션 생성, AI 대화 흐름 제어, SMS 발송, WebSocket 이벤트 브로드캐스트를 모두 담당합니다.

---

## 기술 스택

| 분류 | 기술 |
|---|---|
| 런타임 | Node.js (CommonJS) |
| 실시간 통신 | ws 8.16.0 (WebSocket) |
| 프로세스 관리 | PM2 (ecosystem.config.js) |
| SMS | Solapi HMAC-SHA256 (서버 직접 호출) |
| HTTP 클라이언트 | Node 내장 https 모듈 |
| 환경 설정 | ecosystem.config.js 환경변수 |

---

## 파일 구조

```
server/
├── server.js          ← 프로덕션 서버 (EC2)
├── local_server.js    ← 로컬 개발 서버
├── ecosystem.config.js← PM2 설정 + 환경변수
└── package.json
```

---

## API 책임 (제공 목록)

Team B가 Team A에 제공하는 모든 API는 `docs/shared/api-contracts.md` 참조.

| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | /sessions | 세션 생성 (userCode로 proposal-data 조회) |
| PATCH | /sessions/:id | 세션 업데이트 (전화번호 등록 등) |
| POST | /sessions/:id/invite | 초대 토큰 발급 + SMS 발송 |
| GET | /sessions/invite/:token | 토큰으로 sessionId 조회 |
| WS | /sessions/:id/ws | 실시간 이벤트 양방향 채널 |
| GET | /health | 서버 상태 확인 |

---

## 주요 미결 과제

| 우선순위 | 과제 | 담당 에이전트 |
|---|---|---|
| 🔴 HIGH | `QUESTIONS` 하드코딩 제거 → Team C API 연동 | Backend/API |
| 🔴 HIGH | `videoUrl` 하드코딩 제거 → Team C API에서 수신 | Backend/API |
| 🟡 MID | `ADMIN_SERVER_URL` 환경변수 추가 | DevOps/Build |
| 🟡 MID | proposal-data 조회 실패 시 폴백 처리 | AI Flow |
| 🟢 LOW | local_server.js도 동일하게 동기화 | Backend/API |

---

## 팀 경계 규칙

- `flutter_application_1/` Dart 코드를 수정하지 않습니다.
- Team C의 `/api/auth/*`, `/api/users/*` (관리자 전용 API)를 호출하지 않습니다.
- `GET /api/users/:userCode/proposal-data` (공개 API)만 사용합니다.
- DB에 직접 접근하지 않습니다 (반드시 Team C API 경유).

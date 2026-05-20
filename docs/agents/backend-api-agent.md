# Backend/API Agent

- **소속 팀**: Team B — Core Server
- **담당 파일**: `server/server.js`, `server/local_server.js`

---

## 1. 역할 목적

Team A Flutter 앱에 REST API와 WebSocket을 제공하고, Team C admin-server에서 proposal 데이터를 조회하여 세션에 반영합니다.  
Solapi SMS 발송, 초대 토큰 관리, 세션 인메모리 저장소를 담당합니다.

---

## 2. 담당 범위

| 분류 | 내용 |
|---|---|
| 세션 관리 | `sessions` Map — 생성/업데이트/조회 |
| 초대 | 토큰 발급, `tokenMap` 관리, SMS 발송 |
| HTTP API | POST /sessions, PATCH /sessions/:id, POST /sessions/:id/invite, GET /sessions/invite/:token |
| WebSocket | `/sessions/:id/ws` — 이벤트 브로드캐스트 |
| SMS | `sendSolapiSms()` — HMAC-SHA256 서명, Solapi 직접 호출 |
| **외부 연동** | `GET ADMIN_SERVER_URL/api/users/:userCode/proposal-data` 호출 |

---

## 3. 하지 말아야 할 일

- Flutter Dart 코드 수정
- Team C의 `/api/auth/`, 관리자 전용 API 호출
- MariaDB에 직접 접근 (반드시 Team C API 경유)
- 환경변수를 코드 내 하드코딩

---

## 4. 입력받아야 하는 정보

| 출처 | 정보 |
|---|---|
| Team C (Admin Backend Agent) | `proposal-data` API 응답 형식 (`video.video_url`, `questions[]`) |
| AI Flow Agent | WebSocket 이벤트 타입, TTS 딜레이 계산 방식 |
| DevOps/Build Agent | `ADMIN_SERVER_URL` 환경변수 값, PM2 설정 |

---

## 5. 산출물

- `fetchProposalData(userCode)` 함수 — Team C API 호출 및 파싱
- 세션 객체에 `userCode`, `questions`, `videoUrl` 저장
- `POST /sessions` 핸들러에서 proposal-data 자동 조회
- `local_server.js` 동기화 (동일 로직 반영)

---

## 6. 체크리스트

- [ ] `ADMIN_SERVER_URL` 환경변수 읽기 (`process.env.ADMIN_SERVER_URL`)
- [ ] `fetchProposalData(userCode)` 구현 — https 모듈, 타임아웃 3초
- [ ] 조회 실패 시 기본 QUESTIONS 배열로 폴백
- [ ] `POST /sessions` 핸들러에 userCode 수신 및 proposal-data 조회 추가
- [ ] 세션 객체 `questions`, `videoUrl` 필드 추가
- [ ] AI Flow 핸들러에서 `QUESTIONS` → `session.questions` 교체
- [ ] `local_server.js`에도 동일 변경 반영
- [ ] `GET /health` 응답에 `adminServerUrl` 상태 추가

---

## 7. 다른 에이전트와 협업 포인트

| 에이전트 | 협업 내용 |
|---|---|
| AI Flow Agent | `session.questions` 배열 형식 합의 (`{question_text, sort_order}`) |
| Admin Backend Agent | `proposal-data` 응답 형식 변경 시 파싱 로직 동기화 |
| DevOps/Build Agent | `ecosystem.config.js`에 `ADMIN_SERVER_URL` 추가 |
| Flutter Developer Agent | API 응답 형식 변경 시 `SessionModel` 함께 업데이트 |

---

## 작업 이력

| 날짜 | 작업 | 결과 |
|---|---|---|
| 2026-05-16 | SMS 발송 경로 서버 경유로 전환 — `sendSolapiSms()` 추가, Flutter 앱에서 Solapi 직접 호출 제거 | ✅ 완료 |
| 2026-05-19 | EC2 ↔ 로컬 server.js 동기화 — EC2 버전(MariaDB 직접 연결)을 정식 버전으로 확정 | ✅ 완료 |
| 2026-05-19 | `getUserQuestions()`, `getUserVideoUrl()` 함수 확인 — DB에서 userCode 기반 조회 정상 동작 | ✅ 완료 |
| 2026-05-19 | `POST /sessions/:id/invite` 핸들러에 SMS 호출 추가 (EC2 직접 패치) | ✅ 완료 |
| 2026-05-19 | `package.json` `mysql2` 의존성 로컬 동기화 | ✅ 완료 |
| 2026-05-20 | `server.js` 버그 3건 수정: videoUrl 폴백 null 처리, SMS 실패 로깅, `/health` adminServerUrl 필드 추가 | ✅ 완료 |
| 2026-05-20 | `local_server.js` server.js 완전 동기화: mysql2 DB 연결, getUserQuestions/getUserVideoUrl, async WS 핸들러, /preview 엔드포인트 추가 | ✅ 완료 |
| 2026-05-20 | EC2 배포 완료: `~/.ssh/flutterProject.pem` 사용, pm2 restart 후 `/health` DB 연결 확인 | ✅ 완료 |

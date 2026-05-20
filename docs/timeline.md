# 개발 타임라인

> 이 문서는 FLUTTERPROJECT에서 진행된 **실제 작업을 날짜/에이전트별로 기록**합니다.
> 작업이 완료될 때마다 해당 에이전트가 이 문서를 업데이트합니다.

---

## 실제 작업 이력

### 2026-05-16

#### [Security Agent] Solapi API 키 Flutter 앱에서 제거
- `config/env.json`, `config/env.aws.json`, `config/env.prod.json`에서 Solapi 키 3개 제거
- 이유: 앱 바이너리에 API 키가 노출되면 키 탈취 위험
- 결과: Flutter 앱은 Solapi 키를 보유하지 않음

#### [Backend/API Agent] SMS 발송 경로 서버 경유로 전환
- `server/server.js`에 `sendSolapiSms()` 함수 추가 (HMAC-SHA256 서명)
- `POST /sessions/:id/invite` 핸들러에서 SMS 자동 발송
- `session_provider.dart` 수정: 서버 성공 시 클라이언트 SMS 호출 생략
- 이전 흐름: Flutter → Solapi (IP 차단)
- 변경 흐름: Flutter → EC2 server.js → Solapi

#### [DevOps/Build Agent] iOS Release 빌드 및 실기기 설치
- 명령: `flutter build ios --release --dart-define-from-file=config/env.prod.json`
- 대상 기기: iPhone (UDID: 00008150-001A15DE223A401C)
- 빌드 시간: 24.2s, 용량: 709.2MB
- USB 없이 독립 실행 가능 (Release 빌드 = 디버그 서버 의존 없음)
- 서명: 자동 서명 (팀 TP2KGD2S8D)

---

### 2026-05-18

#### [Flutter Developer Agent] 3차 수정 git pull 반영
- `session_model.dart`: `userCode` 필드 추가 (MariaDB user_videos/ai_questions 연결 키)
- `session_provider.dart`: `createSession()`에 `userCode` 파라미터 추가
- `session_create_screen.dart`: 영상 ID 입력 → 사용자 코드 입력으로 UI 개편

---

### 2026-05-19

#### [PM Agent] Harness 3팀 구조 설계 및 문서화
- 3팀 구조 확정: Team A(Flutter), Team B(Core Server), Team C(Admin System)
- Cross-Team: PM, QA/QC, DevOps/Build, Security
- 생성 문서 17개:
  - `docs/teams/` × 3 (team-a, team-b, team-c)
  - `docs/agents/` × 10 (flutter-developer, cast-tv, backend-api, ai-flow, admin-backend, admin-frontend, pm, qa-qc, devops-build, security)
  - `docs/shared/` × 2 (api-contracts, websocket-event-contracts)
  - `docs/timeline.md`, `docs/harness-development-plan.md`

#### [Backend/API Agent] EC2 ↔ 로컬 server.js 소스 동기화
- 문제: EC2의 server.js(MariaDB 직접 연결)와 로컬 server.js(Admin API 경유)가 달랐음
- 판정: EC2 버전이 최신 정식 버전
- 조치: 로컬을 EC2 버전으로 덮어씀
- 변경 내용:
  - `mysql2/promise` 직접 연결 방식 (Admin Server API 경유 제거)
  - `getUserQuestions(userCode)`: DB에서 커스텀 질문 조회
  - `getUserVideoUrl(userCode)`: DB에서 영상 URL 조회
  - `DEFAULT_QUESTIONS`: DB 조회 실패 시 폴백 질문 배열
- `package.json`: `mysql2` 의존성 추가

#### [DevOps/Build Agent] EC2 SSH 접속 및 서버 배포
- PEM 키: `~/Desktop/flutterProject.pem`
- EC2 IP: `3.34.99.69` / 유저: `ubuntu`
- EC2 보안그룹 SSH 인바운드 룰에 `121.167.183.204/32` 추가 후 접속 성공
- 배포 내용:
  - `server.js`에 `sendSolapiSms()` 추가 및 invite 핸들러 연결
  - `ecosystem.config.js`에 Solapi 키 3개 추가 (`SOLAPI_API_KEY`, `SOLAPI_API_SECRET`, `SOLAPI_FROM`)
  - `admin-server/.env`: `JWT_SECRET` 실값 교체, `SERVER_BASE_URL` `3.34.99.69`로 수정
  - PM2 재시작: `pm2 stop → delete → start ecosystem.config.js`
  - `pm2 save` 완료 (재부팅 후 자동 시작)
- 확인: `GET /health` → `{"status":"ok","db":"connected"}`
- 배포 스크립트 생성: `deploy.sh` (server / admin / all 옵션)

#### [Security Agent] Solapi 허용 IP에 EC2 추가
- 문제: Solapi API 키 허용 IP 목록에 EC2 IP 없음 → 403 Forbidden
- 오류 메시지: `허용되지 않은 IP(3.34.99.69)로 접근하고 있습니다.`
- 조치: 솔라피 대시보드 → API 키 관리 → `3.34.99.69` 추가
- 검증: EC2에서 테스트 SMS 발송 → HTTP 200, `01031577950` 수신 확인
- EC2 PM2 로그: `📱 SMS 발송 성공 → 010****7950`

#### [DevOps/Build Agent] iOS Release 재빌드 및 재설치
- 사유: server.js 동기화 및 SMS 경로 변경 반영
- `USE_REAL_CAST: false` (Mock Cast 유지) + EC2 서버 연결
- 빌드 완료 후 실기기 재설치

#### [DevOps/Build Agent] Git 4차 커밋 및 Push
- 브랜치: `main`
- 커밋: `1a9464a` — 4차 수정 (Harness 구조 도입 및 SMS 서버 발송 전환)
- 변경: server.js, ecosystem.config.js, package.json, session_provider.dart, docs/ 17개, deploy.sh 등

---

### 2026-05-20

#### [DevOps/Build Agent] ai_proposal_system 서브모듈 → 실제 파일 재커밋
- 문제: `4차 수정` 커밋에서 `ai_proposal_system`이 `160000 commit` (서브모듈 포인터)로 등록됨
- 원인: 내부에 `.git` 디렉토리가 남아 있어 git이 서브모듈로 인식
- 조치:
  1. `git rm --cached ai_proposal_system/ai_proposal_system` (포인터 제거)
  2. `rm -rf .../ai_proposal_system/.git` (내부 .git 삭제)
  3. 일반 파일로 재추가
- `.gitignore` 추가: `admin-server/.env`, `node_modules/`, `admin-client/build/`
- 결과: `100644 blob` 모드로 실제 파일 50개 정상 커밋
- 커밋: `f11c305` — 5차 수정

---

### 2026-05-20

#### [Flutter Developer Agent + Backend/API Agent + Admin Backend Agent] 2026-05-20 전체 작업 요약

##### server.js / local_server.js
- videoUrl 폴백 `null` 처리 (Flutter 로컬 에셋 폴백 정상화)
- SMS 실패 로깅 추가 (`.catch(() => {})` → `.catch(err => log(...))`)
- `/health` 응답에 `adminServerUrl` 필드 추가 (api-contracts.md 계약 준수)
- OpenAI Realtime API 연동: `OPENAI_API_KEY` 환경변수, `startRealtimeSession()`, `handleRealtimeEvent()`, `rtHandleProposalComplete()`
- `turn_detection: null` (수동 push-to-talk 모드)
- `audioChunk` / `audioCommit` WebSocket 이벤트 추가 (User B 음성 스트리밍)
- `sid = d.sessionId || TOKEN` fallback 버그 수정 (invite 페이지 멈춤 해결)
- 초대 HTML 전면 재작성: push-to-talk 대형 마이크 버튼 UI, PCM16 24kHz 오디오 캡처

##### Team C (ai_proposal_system)
- `ai_questions` 테이블에 `answer_type ENUM('open','closed')`, `expected_answer TEXT` 컬럼 추가
- `question.model.js`, `questions.controller.js`: 신규 필드 CRUD 반영
- `QuestionForm.jsx`: answer_type 선택 + closed 선택 시 expected_answer 입력 UI

##### Flutter (flutter_application_1)
- `session_create_screen.dart`: 세션 이름 입력 필드 제거 (userCode + 전화번호만 남김)
- `ai_avatar_screen.dart`: 2D CustomPainter 제거 → `webview_flutter` + Three.js 3D Hello Kitty 캐릭터
  - 오른쪽에서 옆모습으로 걸어 등장 → 정면 전환 → 인사 제스처
  - 말하기 / 듣기 / 대기 상태 JS 브릿지 연동 (`setKittyState()`)
  - 빨간 리본, 노란 코, 수염, 꼬리 포함 헬로키티 3D 모델 (Three.js)
- `pubspec.yaml`: `webview_flutter: ^4.7.0` 추가

##### EC2 배포
- server.js, local_server.js 배포 완료
- OPENAI_API_KEY, ADMIN_SERVER_URL 환경변수 추가
- EC2 DB ALTER TABLE: answer_type, expected_answer 컬럼 추가

---

#### [Backend/API Agent + Admin Backend Agent + Admin Frontend Agent] Phase 4 AI 대화 개선 — 3팀 협력
- **Team C — DB 스키마**: `ai_questions` 테이블에 `answer_type ENUM('open','closed')`, `expected_answer TEXT` 컬럼 추가 (EC2 ALTER TABLE 완료)
- **Team C — question.model.js**: `findActiveByUserCode` 쿼리에 신규 컬럼 포함, `create`/`update` 함수에 `answer_type`·`expected_answer` 반영
- **Team C — questions.controller.js**: 신규 필드 CRUD 처리 추가
- **Team C — QuestionForm.jsx**: `answer_type` 선택 드롭다운(open/closed), `closed` 선택 시 `expected_answer` 입력 필드 조건부 표시
- **Team B — server.js**: Claude AI(`@anthropic-ai/sdk`) 연동 추가
  - `DEFAULT_QUESTIONS`: 문자열 배열 → `{question_text, answer_type, expected_answer}` 객체 배열
  - `getUserQuestions()`: `answer_type`, `expected_answer` 컬럼 포함 조회, 객체 배열 반환
  - `generateAiReaction()`: Claude Haiku로 자연스러운 반응 생성, JSON `{response, moveToNext}` 파싱
  - `handleUserBJoined()`: `conversationHistory`, `retryCount` 세션 필드 초기화
  - `handleUserBSpeech()`: 완전 재작성 — LLM 반응 → open 무조건 진행 / closed 정답 판별 → 1회 재시도 허용 후 강제 진행
- **Team B — local_server.js**: server.js와 동일 로직 동기화 완료
- **Team B — package.json**: `@anthropic-ai/sdk ^0.39.0` 의존성 추가
- **EC2 배포 완료**: ai-proposal-server, ai-proposal-admin 모두 pm2 restart 완료
- **ANTHROPIC_API_KEY 미설정 상태**: 현재 기본 반응 모드로 동작. 실제 AI 반응을 원하면 EC2 `ecosystem.config.js`에 `ANTHROPIC_API_KEY` 추가 필요

#### [Backend/API Agent] server.js 버그 수정 3건 및 local_server.js 완전 동기화
- **수정 1 — videoUrl 폴백 오류**: `handleUserBSpeech`에서 DB 영상 없을 때 `'assets/video/proposal.mp4'`(Flutter 로컬 에셋 경로)를 WebSocket으로 전송하던 문제 수정
  - 변경: `|| 'assets/video/proposal.mp4'` → `|| null`
  - 효과: Flutter `avatar_provider.dart`의 `?? _kDefaultVideoUrl` 폴백이 정상 동작, VideoPlayer가 에셋 경로를 네트워크 URL로 오인하지 않음
- **수정 2 — SMS 오류 묵살**: `sendSolapiSms().catch(() => {})` → `.catch(err => log('❌', ...))` 로 변경, SMS 실패 원인을 PM2 로그에서 확인 가능하게 됨
- **수정 3 — /health 응답 계약 불일치**: `api-contracts.md`에 명시된 `adminServerUrl` 필드 누락 → `process.env.ADMIN_SERVER_URL || null` 추가
- **local_server.js 완전 동기화**: 기존 하드코딩 방식(QUESTIONS 배열, videoUrl='assets/video/proposal.mp4')을 server.js와 동일한 구조로 재작성
  - mysql2 DB 연결 + getUserQuestions() / getUserVideoUrl() 함수 추가
  - handleUserBJoined / handleUserBSpeech async 전환 (DB 기반 질문·영상 로드)
  - POST /sessions에 userCode 필드 추가
  - GET /users/:userCode/preview 엔드포인트 추가
  - GET /health에 DB 상태 및 adminServerUrl 추가
  - Solapi SMS 선택적 연동 (환경변수 없으면 건너뜀)
- **배포 완료**: EC2 `ai-proposal-server` PM2 재시작 완료, `/health` → `{"status":"ok","db":"connected","adminServerUrl":null}` 확인

---

## Phase 현황

| Phase | 상태 | 완료일 |
|---|---|---|
| Phase 0: 프로젝트 분석 | ✅ 완료 | 2026-05-19 |
| Phase 1: API 계약서 확정 | ✅ 완료 | 2026-05-19 |
| Phase 2: Team C Admin 배포 | ✅ 완료 | 2026-05-19 (EC2 배포 완료, DB 연결) |
| Phase 3: Team B ↔ Team C 연동 | ✅ 완료 | 2026-05-19 (userCode → DB 조회) |
| Phase 4: Flutter 앱 AI 대화 E2E | 🔄 진행 중 | AI 대화 흐름 개선 완료, ANTHROPIC_API_KEY 설정 후 실기기 E2E 테스트 필요 |
| Phase 5: Chromecast 실제 연동 | ⏳ 대기 | 하드웨어 준비 필요 |
| Phase 6: QA/QC 전체 테스트 | ⏳ 대기 | - |
| Phase 7: iOS 빌드 및 배포 준비 | 🔄 진행 중 | Release 빌드 완료, 보안 점검 진행 중 |

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

## Phase 현황

| Phase | 상태 | 완료일 |
|---|---|---|
| Phase 0: 프로젝트 분석 | ✅ 완료 | 2026-05-19 |
| Phase 1: API 계약서 확정 | ✅ 완료 | 2026-05-19 |
| Phase 2: Team C Admin 배포 | ✅ 완료 | 2026-05-19 (EC2 배포 완료, DB 연결) |
| Phase 3: Team B ↔ Team C 연동 | ✅ 완료 | 2026-05-19 (userCode → DB 조회) |
| Phase 4: Flutter 앱 AI 대화 E2E | 🔄 진행 중 | - |
| Phase 5: Chromecast 실제 연동 | ⏳ 대기 | 하드웨어 준비 필요 |
| Phase 6: QA/QC 전체 테스트 | ⏳ 대기 | - |
| Phase 7: iOS 빌드 및 배포 준비 | 🔄 진행 중 | Release 빌드 완료, 보안 점검 진행 중 |

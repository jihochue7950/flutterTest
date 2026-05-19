# 개발 타임라인

---

## Phase 0 — 프로젝트 분석 ✅

**상태**: 완료  
**산출물**:
- 3팀 구조 설계 완료
- `docs/` 문서 16개 생성 완료
- 주요 미결 과제 목록 확정

---

## Phase 1 — API 계약서 확정 ✅

**상태**: 완료  
**게이팅 조건**: `docs/shared/api-contracts.md`, `websocket-event-contracts.md` 작성  
**산출물**:
- `docs/shared/api-contracts.md`
- `docs/shared/websocket-event-contracts.md`
- 3팀 overview 문서

---

## Phase 2 — Team C Admin System 배포 및 DB 실값 설정

**상태**: 진행 필요  
**담당**: Team C (Admin Backend Agent, Admin Frontend Agent), DevOps/Build Agent  
**게이팅 조건**: `curl http://EC2_IP:8080/api/users/[userCode]/proposal-data` 정상 응답

**작업 목록**:
- [ ] `admin-server/.env` 실값 설정 (DB_PASSWORD, JWT_SECRET, SERVER_BASE_URL)
- [ ] `admins` 테이블 bcrypt 해시 교체
- [ ] `/var/www/ai-proposal/videos` 디렉토리 생성 및 권한 설정
- [ ] `admin-client` 빌드 및 admin-server 정적 서빙 확인
- [ ] PM2로 `ai-proposal-admin` 프로세스 시작
- [ ] 테스트 userCode 1개 등록, 영상 업로드, 질문 4개 등록
- [ ] `proposal-data` API 응답 검증

---

## Phase 3 — Team B Core Server ↔ Team C 연동 ✅ (코드 완성)

**상태**: 코드 수정 완료, EC2 배포 필요  
**담당**: Team B (Backend/API Agent, AI Flow Agent), DevOps/Build Agent  
**게이팅 조건**: `userCode`별 커스텀 질문과 영상 URL이 세션에 정상 반영

**완료된 작업**:
- [x] `server.js`: `fetchProposalData(userCode)` 함수 추가
- [x] `server.js`: `POST /sessions`에서 userCode → proposal-data 자동 조회
- [x] `server.js`: `session.questions`, `session.videoUrl` 동적 저장
- [x] `server.js`: AI Flow에서 `QUESTIONS` 하드코딩 → `session.questions` 교체
- [x] `ecosystem.config.js`: `ADMIN_SERVER_URL` 환경변수 추가

**남은 작업**:
- [ ] EC2에서 `pm2 restart ai-proposal-server`
- [ ] `local_server.js` 동일 변경 반영

---

## Phase 4 — Flutter 앱 AI 대화 E2E 검증

**상태**: 대기 (Phase 3 EC2 배포 후 진행)  
**담당**: Team A (Flutter Developer Agent), Team B  
**게이팅 조건**: 실기기에서 userCode 입력 → AI 대화 4문답 완주

**작업 목록**:
- [ ] `env.prod.json` 기준 Release 빌드 후 실기기 설치
- [ ] `SessionCreateScreen`: userCode + 전화번호 입력 흐름 검증
- [ ] AI 아바타 TTS 음성 출력 + User B STT 답변 흐름 검증
- [ ] DB 기반 커스텀 질문 4개 순서 정상 진행 확인

---

## Phase 5 — Chromecast 실제 연동

**상태**: 대기 (하드웨어 준비 필요)  
**담당**: Team A (Cast/TV Agent)  
**게이팅 조건**: TV에서 DB 기반 `videoUrl` 영상 재생 확인

**전제 조건**:
- [ ] Chromecast 동글 또는 Google TV 확보
- [ ] Google Cast Developer Console 앱 등록 → Application ID 발급

**작업 목록**:
- [ ] `google_cast_service.dart` 실제 Google Cast SDK 구현
- [ ] `USE_REAL_CAST=true` 환경변수로 GoogleCastService 전환
- [ ] TV에서 `videoUrl` 영상 재생 E2E 확인

---

## Phase 6 — QA/QC 전체 E2E 테스트

**상태**: 대기  
**담당**: QA/QC Agent  
**게이팅 조건**: 정상 흐름 3회 연속 성공 + 엣지 케이스 전체 통과

---

## Phase 7 — iOS Release 빌드 및 배포 준비

**상태**: 기초 완료 (Release 빌드 경험 있음)  
**담당**: DevOps/Build Agent, Security Agent  
**게이팅 조건**: Security 점검 통과, 실기기 무선 실행 확인

**작업 목록**:
- [ ] Security Agent 최종 점검 통과
- [ ] Release 빌드 + 실기기 설치
- [ ] Apple Developer 계정 서명 유효기간 확인
- [ ] TestFlight 배포 검토 (선택)

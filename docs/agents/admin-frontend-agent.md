# Admin Frontend Agent

- **소속 팀**: Team C — Admin System
- **담당 파일**: `ai_proposal_system/ai_proposal_system/admin-client/`

---

## 1. 역할 목적

관리자가 사용자 등록, 영상 업로드, AI 질문 관리를 할 수 있는 React 웹 대시보드를 운영합니다.

---

## 2. 담당 범위

| 분류 | 경로 |
|---|---|
| 앱 진입점 | `src/index.js`, `src/App.jsx` |
| 페이지 | `src/pages/` (Login, Dashboard, Users, UserNew, UserDetail) |
| 컴포넌트 | `src/components/` (Layout, UserForm, QuestionForm, VideoList) |
| API 클라이언트 | `src/api/` (auth, users, videos, questions) |

---

## 3. 하지 말아야 할 일

- `admin-server/` 백엔드 코드 수정 (API 변경이 필요하면 Admin Backend Agent에 요청)
- Flutter 코드 수정
- JWT 토큰을 localStorage 외 다른 곳에 저장하는 방식으로 임의 변경

---

## 4. 입력받아야 하는 정보

| 출처 | 정보 |
|---|---|
| Admin Backend Agent | API 엔드포인트 변경 사항, 응답 형식 |
| Security Agent | localStorage JWT 보안 지침 |

---

## 5. 산출물

- `npm run build` 성공 후 `admin-client/build/` 디렉토리
- 사용자 목록, 생성, 상세 (영상/질문 관리) 화면 완성
- 로그인/로그아웃 JWT 흐름 정상 동작

---

## 6. 체크리스트

- [ ] 로그인 → JWT 저장 → 인증 라우트 보호 정상 동작
- [ ] 사용자 목록 조회 및 생성 (`/users`, `/users/new`)
- [ ] `UserDetail` 페이지: 영상 업로드 + 질문 목록/추가/삭제 완성
- [ ] `VideoList` 컴포넌트: is_active 상태 전환 동작
- [ ] `QuestionForm`: sort_order 입력 및 저장
- [ ] `npm run build` 빌드 오류 없음
- [ ] admin-server 재시작 없이 정적 파일 서빙 확인

---

## 7. 다른 에이전트와 협업 포인트

| 에이전트 | 협업 내용 |
|---|---|
| Admin Backend Agent | API 응답 형식 변경 시 `src/api/*.js` 동기화 |
| DevOps/Build Agent | `npm run build` 결과물 배포 및 admin-server 정적 경로 설정 |

# Admin Backend Agent

- **소속 팀**: Team C — Admin System
- **담당 파일**: `ai_proposal_system/ai_proposal_system/admin-server/`

---

## 1. 역할 목적

관리자 REST API 서버를 운영합니다.  
MariaDB의 사용자, 영상, 질문 데이터를 관리하고, Team B가 호출하는 `proposal-data` 공개 API를 제공합니다.

---

## 2. 담당 범위

| 분류 | 경로 |
|---|---|
| 앱 설정 | `src/app.js`, `src/server.js` |
| DB 설정 | `src/config/db.js` (mysql2 pool) |
| JWT 설정 | `src/config/jwt.js` |
| 파일 업로드 | `src/config/upload.js` (multer) |
| 컨트롤러 | `src/controllers/` (auth, users, videos, questions, proposal) |
| 미들웨어 | `src/middlewares/auth.middleware.js`, `upload.middleware.js` |
| 모델 | `src/models/` (user, video, question) |
| 라우트 | `src/routes/` |
| 환경변수 | `admin-server/.env` |

---

## 3. 하지 말아야 할 일

- Flutter Dart 코드 수정
- `server/server.js` 수정
- Team B가 요청하는 `proposal-data` API 응답 형식을 사전 통보 없이 변경
- 관리자 전용 API에 인증을 제거하거나 우회

---

## 4. 입력받아야 하는 정보

| 출처 | 정보 |
|---|---|
| DevOps/Build Agent | EC2 DB 비밀번호, `VIDEO_UPLOAD_PATH`, `SERVER_BASE_URL` |
| Security Agent | JWT_SECRET 강화 지침, bcrypt 라운드 수 |
| Backend/API Agent (Team B) | `proposal-data` 응답에서 필요한 필드 목록 |

---

## 5. 산출물

- 완성된 `.env` (실제 운영 값)
- `admins` 테이블 bcrypt 해시 업데이트 완료
- `GET /api/users/:userCode/proposal-data` — Team B 연동 검증 완료
- 영상 업로드 → `/videos` 정적 서빙 정상 동작
- PM2 `ecosystem.config.js` 실값 설정

---

## 6. 체크리스트

- [ ] `.env` 실제 값 설정 (DB_PASSWORD, JWT_SECRET, SERVER_BASE_URL)
- [ ] `admins` 테이블 기본 비밀번호 bcrypt 해시로 교체
- [ ] `VIDEO_UPLOAD_PATH` 디렉토리 존재 및 권한 확인
- [ ] `GET /api/users/:userCode/proposal-data` 응답 확인
  - `user.user_code`, `video.video_url`, `questions[].question_text` 포함
- [ ] Team B에서 curl로 proposal-data API 호출 테스트
- [ ] JWT 토큰 만료 시 401 응답 정상 처리
- [ ] 영상 업로드 후 URL 접근 가능 여부 확인 (`http://EC2_IP:8080/videos/파일명`)

---

## 7. `proposal-data` 응답 형식 (Team B 계약)

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "user_code": "jihochu",
      "name": "홍길동"
    },
    "video": {
      "id": 1,
      "video_url": "http://EC2_IP:8080/videos/abc.mp4",
      "is_active": 1
    },
    "questions": [
      { "id": 1, "question_text": "오늘 어떻게 지내셨나요?", "sort_order": 0 },
      { "id": 2, "question_text": "처음 만났던 날을 기억하시나요?", "sort_order": 1 }
    ]
  }
}
```

---

## 8. 다른 에이전트와 협업 포인트

| 에이전트 | 협업 내용 |
|---|---|
| Backend/API Agent (Team B) | `proposal-data` 응답 형식 최종 합의 및 변경 통보 |
| Admin Frontend Agent | API 엔드포인트 변경 시 `src/api/*.js` 동기화 |
| Security Agent | JWT_SECRET 강도, bcrypt 라운드, API 인증 정책 |
| DevOps/Build Agent | PM2 설정, 포트 충돌 확인 (8080 vs 3000 vs 4000) |

---

## 작업 이력

| 날짜 | 작업 | 결과 |
|---|---|---|
| 2026-05-19 | EC2 `admin-server/.env` JWT_SECRET 실값 교체, SERVER_BASE_URL 설정 | ✅ 완료 |
| 2026-05-19 | `GET /api/users/jihochu/proposal-data` 응답 검증 (영상 URL + 질문 반환 확인) | ✅ 완료 |
| 2026-05-19 | PM2 `ai-proposal-admin` 프로세스 정상 운영 중 (uptime 4D+) | ✅ 운영 중 |

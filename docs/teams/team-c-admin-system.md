# Team C — Admin System

## 개요

| 항목 | 내용 |
|---|---|
| 담당 디렉토리 | `ai_proposal_system/` |
| 소속 에이전트 | Admin Backend, Admin Frontend |
| 주 런타임 | Node.js (Express) + React SPA |
| 포트 | 8080 (admin-server, admin-client 정적 파일 서빙 포함) |
| DB | MariaDB `ai_proposal` (EC2 로컬) |
| 상위 소비자 | Team B (proposal-data API), 관리자 브라우저 |

---

## 시스템 내 위치

```
[관리자 브라우저]
        │  HTTP (port 8080, JWT 인증)
        ▼
[Team C: Admin System]  ◀─ 데이터 원천 (Source of Truth)
        │  GET /api/users/:userCode/proposal-data (인증 불필요)
        ▼
[Team B: Core Server]
```

Team C는 **데이터 원천(Source of Truth)** 입니다.  
모든 사용자 정보, 영상 URL, 커스텀 AI 질문은 여기서 관리됩니다.

---

## 기술 스택

### Admin Server
| 분류 | 기술 |
|---|---|
| 프레임워크 | Express 4.19.2 |
| 인증 | JWT (jsonwebtoken 9.0.2) + bcrypt |
| DB | mysql2 3.9.7 (MariaDB) |
| 파일 업로드 | multer 1.4.5 |
| 환경변수 | dotenv (.env 파일) |
| 프로세스 | PM2 (ecosystem.config.js) |

### Admin Client
| 분류 | 기술 |
|---|---|
| 프레임워크 | React 18.3.1 |
| 라우팅 | react-router-dom 6.23.1 |
| HTTP | axios 1.7.2 |
| 빌드 | react-scripts (CRA), 빌드 후 admin-server에서 정적 서빙 |

---

## DB 스키마

```
admins         ← 관리자 계정 (bcrypt 해시 비밀번호)
users          ← user_code (PK 역할), 이름, 전화번호
user_videos    ← user_code FK, 영상 URL, is_active
ai_questions   ← user_code FK, 질문 텍스트, sort_order, is_active
```

---

## API 책임

### 공개 API (인증 불필요 — Team B 전용)
| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | /api/users/:userCode/proposal-data | 영상 URL + 커스텀 질문 반환 |

### 관리자 API (JWT 인증 필요)
| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | /api/auth/login | 관리자 로그인 |
| GET/POST | /api/users | 사용자 목록/생성 |
| GET/PUT/DELETE | /api/users/:id | 사용자 상세/수정/삭제 |
| POST | /api/users/:id/videos | 영상 업로드 |
| GET/PUT/DELETE | /api/videos | 영상 직접 조회/수정/삭제 |
| GET/POST | /api/users/:id/questions | 질문 목록/생성 |
| GET/PUT/DELETE | /api/questions | 질문 직접 조회/수정/삭제 |

---

## 주요 미결 과제

| 우선순위 | 과제 | 담당 에이전트 |
|---|---|---|
| 🔴 HIGH | `.env` 실값 설정 (DB 비밀번호, JWT_SECRET) | Admin Backend |
| 🔴 HIGH | admins 테이블 bcrypt 해시 플레이스홀더 교체 | Admin Backend |
| 🟡 MID | `/videos` 정적 파일 경로 권한 설정 확인 | Admin Backend |
| 🟡 MID | Team B와 proposal-data API 응답 형식 최종 확인 | Admin Backend |
| 🟢 LOW | admin-client UserDetail 질문 편집 UI 완성도 검증 | Admin Frontend |

---

## 파일 구조

```
ai_proposal_system/
└── ai_proposal_system/
    ├── schema.sql
    ├── deploy.sh
    ├── DEPLOYMENT_GUIDE.md
    ├── proposal-data-example.js   ← Team B 연동 예시 코드
    ├── admin-server/
    │   ├── src/
    │   │   ├── app.js
    │   │   ├── server.js
    │   │   ├── config/          (db, jwt, upload)
    │   │   ├── controllers/     (auth, users, videos, questions, proposal)
    │   │   ├── middlewares/     (auth, upload)
    │   │   ├── models/          (user, video, question)
    │   │   └── routes/
    │   ├── .env                 ← 실값 설정 필요
    │   └── ecosystem.config.js
    └── admin-client/
        └── src/
            ├── App.jsx
            ├── pages/           (Login, Dashboard, Users, UserNew, UserDetail)
            ├── components/      (Layout, UserForm, QuestionForm, VideoList)
            └── api/             (auth, users, videos, questions)
```

---

## 팀 경계 규칙

- `flutter_application_1/` 코드를 수정하지 않습니다.
- `server/` 코드를 수정하지 않습니다.
- Team B에 노출하는 공개 API(`/proposal-data`)의 응답 형식을 임의로 변경하지 않습니다.
- 변경 시 `docs/shared/api-contracts.md`를 먼저 업데이트하고 Team B에 통보합니다.

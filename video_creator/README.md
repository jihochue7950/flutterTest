# Team D — AI 자동 영상 제작 시스템

> 로컬 개발 전용. EC2 미배포.

## 구조

```
video_creator/
├── vc-api/             Express API 서버 (포트 5000)
├── schema-team-d.sql   DB 마이그레이션
└── README.md
```

웹 UI는 기존 `ai_proposal_system/admin-client/`에 통합:
- `/video-creator` — 영상 제작 마법사 (공개)
- `/admin/video-projects` — 관리자 영상 관리

## 로컬 실행

### 1. DB 마이그레이션

```bash
# 로컬 MariaDB / MySQL에 실행
mysql -u root -p ai_proposal < schema-team-d.sql

# 또는 EC2 DB에 직접 연결 시
mysql -h 3.34.99.69 -u [DB_USER] -p[DB_PASSWORD] ai_proposal < schema-team-d.sql
```

### 2. vc-api 실행

```bash
cd video_creator/vc-api

# 패키지 설치
npm install

# 환경변수 설정
cp .env.example .env.local
# .env.local 편집: DB 정보, ANTHROPIC_API_KEY 입력

# 개발 서버 시작 (포트 5000)
npm run dev
```

### 3. admin-client 환경변수 추가

`ai_proposal_system/admin-client/.env.local` 생성:
```
REACT_APP_VC_API_URL=http://localhost:5000
```

```bash
cd ai_proposal_system/ai_proposal_system/admin-client
npm start   # 기존 방식으로 실행
```

## API 엔드포인트 요약

| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | /api/video-projects | 프로젝트 생성 |
| POST | /api/video-projects/:id/photos | 사진 업로드 |
| PUT  | /api/video-projects/:id/photos/reorder | 순서 변경 |
| GET  | /api/music-library | 음악 목록 |
| POST | /api/video-projects/:id/music/select | 음악 선택 |
| POST | /api/video-projects/:id/scenario | 시나리오 저장/AI 생성 |
| POST | /api/admin/video-projects/:id/render | 렌더링 시작 |
| GET  | /api/video-projects/:id/render-status | 렌더 진행 상태 |
| GET  | /api/video-projects/:id/download | 완성 영상 URL |
| GET  | /health | 서버 상태 |

## 영상 생성 흐름

```
[사용자] 이벤트 선택 → 사진 업로드 → 음악 선택 → 시나리오 입력
                                                        ↓ (AI 자동 생성 시)
                                               Claude API → 시나리오 + Scene JSON
[관리자] 관리자 패널에서 확인 → "렌더링 시작" 클릭
                                                        ↓
                                               ffmpeg → MP4 생성
[사용자] 완성 영상 다운로드
```

## ffmpeg 관련

`ffmpeg-static` npm 패키지가 ffmpeg 바이너리를 자동으로 번들합니다.
별도 설치 없이 `npm install` 후 바로 사용 가능합니다.

## Phase 2 계획 (Remotion 전환)

현재: ffmpeg 기반 슬라이드쇼 렌더러
Phase 2: Remotion 기반 고품질 React 애니메이션 (별도 t3.medium 서버 필요)

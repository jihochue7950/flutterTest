# API Contracts

> 팀 간 인터페이스 계약서. 변경 시 반드시 이 문서를 먼저 업데이트하고 관련 팀에 통보합니다.

---

## 1. Team B → Team A 제공 API (`server.js`, port 3000)

### POST /sessions
세션 생성. `userCode`가 있으면 서버가 Team C에서 영상 URL과 질문을 자동 조회합니다.

**Request**
```json
{
  "title": "AI 프로포즈",
  "userCode": "jihochu"
}
```

**Response 200**
```json
{
  "id": "uuid-v4",
  "status": "created",
  "title": "AI 프로포즈",
  "userCode": "jihochu",
  "videoId": null,
  "videoUrl": "http://EC2_IP:8080/videos/abc.mp4",
  "userBPhone": null,
  "inviteToken": null,
  "tvConnected": false,
  "userBJoined": false,
  "currentQuestion": -1,
  "answers": [],
  "createdAt": "2026-05-19T00:00:00.000Z"
}
```

---

### PATCH /sessions/:id
세션 업데이트 (전화번호 등록 등).

**Request**
```json
{ "userBPhone": "01012345678" }
```

**Response 200** — 업데이트된 세션 객체 반환

---

### POST /sessions/:id/invite
초대 토큰 발급 + User B에게 SMS 자동 발송.

**Request** — Body 불필요 (서버가 세션의 `userBPhone` 사용)

**Response 200**
```json
{
  "token": "uuid-v4",
  "inviteUrl": "http://EC2_IP:4000/invite/uuid-v4"
}
```

---

### GET /sessions/invite/:token
토큰으로 sessionId 조회 (User B 초대 페이지에서 사용).

**Response 200**
```json
{ "sessionId": "uuid-v4" }
```

**Response 404** — 토큰 없음

---

### GET /health
서버 상태 확인.

**Response 200**
```json
{
  "status": "ok",
  "sessions": 3,
  "uptime": 12345.6,
  "adminServerUrl": "http://localhost:8080"
}
```

---

### WebSocket `/sessions/:id/ws`
이벤트 기반 양방향 채널. 명세는 `websocket-event-contracts.md` 참조.

---

## 2. Team B → Team C 호출 API (`admin-server`, port 8080)

### GET /api/users/:userCode/proposal-data
인증 불필요. Core Server가 세션 생성 시 호출합니다.

**환경변수**: `ADMIN_SERVER_URL=http://localhost:8080` (같은 EC2인 경우)

**Response 200**
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
      { "id": 1, "question_text": "처음 만났던 날을 기억해?", "answer_type": "closed", "expected_answer": "2022년 3월", "sort_order": 0 },
      { "id": 2, "question_text": "나를 많이 좋아해?",        "answer_type": "open",   "expected_answer": null,        "sort_order": 1 }
    ]
  }
}
```

**Response 404** — userCode 없음
```json
{ "success": false, "message": "사용자를 찾을 수 없습니다." }
```

---

## 3. Team A → Team C 직접 통신

**없음.** Team A는 Team C와 직접 통신하지 않습니다.  
모든 데이터는 Team B(`server.js`)를 경유합니다.

---

## 변경 이력

| 날짜 | 버전 | 변경 내용 | 작성자 |
|---|---|---|---|
| 2026-05-19 | 1.0 | 최초 작성 | PM Agent |

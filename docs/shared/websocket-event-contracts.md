# WebSocket Event Contracts

> Team A(Flutter 앱) ↔ Team B(Core Server) 간 WebSocket 이벤트 명세.  
> 변경 시 반드시 이 문서를 먼저 업데이트하고 양팀에 통보합니다.

---

## 공통 이벤트 구조

```json
{
  "type": "이벤트타입",
  "sessionId": "uuid-v4",
  "data": {},
  "timestamp": "2026-05-19T00:00:00.000Z"
}
```

---

## 이벤트 목록

### 클라이언트 → 서버 (Flutter 앱이 전송)

#### `userBJoined`
User B가 초대 링크에 접속했을 때 전송.

```json
{
  "type": "userBJoined",
  "sessionId": "uuid-v4",
  "data": {},
  "timestamp": "..."
}
```

**서버 동작**: 1초 후 첫 번째 질문(`aiSpeech`) 브로드캐스트

---

#### `userBSpeech`
User B가 답변을 입력/음성으로 제출할 때 전송.

```json
{
  "type": "userBSpeech",
  "sessionId": "uuid-v4",
  "data": { "text": "답변 내용" },
  "timestamp": "..."
}
```

**서버 동작**: 답변 저장 → 다음 질문 전송 or 마무리 → `videoPlayRequested`

---

#### `aiListening`
TV(AiAvatarScreen)에서 TTS 완료 후 User B 입력 활성화 요청.

```json
{
  "type": "aiListening",
  "sessionId": "uuid-v4",
  "data": {},
  "timestamp": "..."
}
```

**서버 동작**: 전체 브로드캐스트 (User B 입력 활성화)

---

### 서버 → 클라이언트 (서버가 브로드캐스트)

#### `aiSpeech`
AI가 말할 텍스트 전달. TV(AiAvatarScreen)에서 TTS로 읽음.

```json
{
  "type": "aiSpeech",
  "sessionId": "uuid-v4",
  "data": { "text": "오늘 어떻게 지내셨나요?" },
  "timestamp": "..."
}
```

**수신자 동작**:
- AiAvatarScreen: TTS 실행 → 완료 후 `aiListening` 전송
- InviteScreen (User B): 말풍선에 텍스트 표시

---

#### `aiListening`
User B 입력 활성화 신호.

```json
{
  "type": "aiListening",
  "sessionId": "uuid-v4",
  "data": {},
  "timestamp": "..."
}
```

**수신자 동작**:
- InviteScreen: 입력창/버튼 활성화

---

#### `userBJoined`
User B 접속 알림 (서버 → 브로드캐스트).

```json
{
  "type": "userBJoined",
  "sessionId": "uuid-v4",
  "data": {},
  "timestamp": "..."
}
```

**수신자 동작**:
- AiAvatarScreen: "User B 접속!" UI 업데이트

---

#### `videoPlayRequested`
모든 질문 완료 후 영상 재생 트리거.

```json
{
  "type": "videoPlayRequested",
  "sessionId": "uuid-v4",
  "data": { "videoUrl": "http://EC2_IP:8080/videos/abc.mp4" },
  "timestamp": "..."
}
```

**수신자 동작**:
- AiAvatarScreen(TV): TTS 중단 → 영상 화면 전환
- InviteScreen(User B): 프로포즈 완료 화면 전환
- Cast/TV Agent: `playVideo(videoUrl)` 호출

---

## Dart EventType enum 매핑

```dart
// lib/core/models/event_model.dart
enum EventType {
  aiSpeech,
  aiListening,
  userBJoined,
  userBSpeech,
  videoPlayRequested,
  aiIntroStarted,
}
```

---

## 변경 이력

| 날짜 | 버전 | 변경 내용 | 작성자 |
|---|---|---|---|
| 2026-05-19 | 1.0 | 최초 작성 | PM Agent |

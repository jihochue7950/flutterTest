# AI Flow Agent

- **소속 팀**: Team B — Core Server
- **담당 파일**: `server/server.js` (WebSocket 이벤트 핸들러), `flutter_application_1/lib/features/avatar/`

---

## 1. 역할 목적

AI 대화 흐름을 설계하고 관리합니다.  
서버의 질문 진행 로직, TTS/STT 타이밍, WebSocket 이벤트 브로드캐스트를 담당합니다.  
DB에서 조회한 커스텀 질문을 사용자별로 적용하는 것이 핵심 목표입니다.

---

## 2. 담당 범위

### Team B 서버 측
| 분류 | 내용 |
|---|---|
| 이벤트 핸들러 | `handleWsEvent()` — userBJoined, userBSpeech, aiListening |
| 질문 진행 | `session.questions[]` 기반 순차 진행 |
| TTS 딜레이 | `ttsDelay(text)` — 글자수 기반 대기 시간 계산 |
| 영상 트리거 | 마지막 질문 완료 후 `videoPlayRequested` 브로드캐스트 |

### Team A 앱 측 (읽기/검토)
| 분류 | 경로 |
|---|---|
| AI 아바타 상태 | `lib/features/avatar/providers/avatar_provider.dart` |
| AI 아바타 화면 | `lib/features/avatar/screens/ai_avatar_screen.dart` |

---

## 3. 하지 말아야 할 일

- Flutter Dart 코드 직접 수정 (검토만 허용)
- DB에 직접 접근
- 질문 순서를 UI에서 임의로 변경
- TTS 완료 신호 없이 다음 질문 전송

---

## 4. 입력받아야 하는 정보

| 출처 | 정보 |
|---|---|
| Backend/API Agent | `session.questions` 배열 (`[{question_text, sort_order}]`) |
| Team C (Admin Backend) | 질문 타입 enum (`intro, needs, budget, concern, closing, custom`) |
| Flutter Developer Agent | TTS 완료 후 `aiListening` 이벤트 수신 방식 |

---

## 5. 산출물

- `session.questions` 배열 기반 동적 질문 진행 로직
- WebSocket 이벤트 명세 (`docs/shared/websocket-event-contracts.md`)
- 폴백 QUESTIONS 배열 (proposal-data 조회 실패 시)

---

## 6. WebSocket 이벤트 흐름

```
[User B 접속]
        │  userBJoined
        ▼
[서버: 1초 후 첫 질문 전송]
        │  aiSpeech { text: questions[0] }
        ▼
[TV: TTS 재생 완료]
        │  aiListening (TTS 딜레이 후 자동 또는 TV에서 신호)
        ▼
[User B: 답변 입력/음성]
        │  userBSpeech { text: "답변 내용" }
        ▼
[서버: 다음 질문 or 마무리]
        │  aiSpeech { text: questions[N] } or 마무리 멘트
        ▼
[마지막 답변 완료]
        │  videoPlayRequested { videoUrl: session.videoUrl }
        ▼
[TV: 영상 재생]
```

---

## 7. 체크리스트

- [ ] `handleWsEvent()` 에서 `QUESTIONS[i]` → `session.questions[i].question_text` 교체
- [ ] `session.answers.length < session.questions.length` 조건으로 진행 판단
- [ ] 질문 없을 경우 폴백 QUESTIONS 배열 사용
- [ ] `videoPlayRequested` 시 `session.videoUrl` (DB 기반) 전송
- [ ] `closing` 멘트를 마지막 커스텀 질문 타입으로 대체 가능 여부 검토

---

## 8. 다른 에이전트와 협업 포인트

| 에이전트 | 협업 내용 |
|---|---|
| Backend/API Agent | `session.questions` 배열 형식 및 저장 시점 합의 |
| Flutter Developer Agent | `EventType` enum 변경 시 `event_model.dart` 동기화 |
| Cast/TV Agent | `videoPlayRequested` payload의 `videoUrl` 형식 확인 |
| QA/QC Agent | 질문 0개, 질문 1개, 네트워크 단절 등 엣지 케이스 시나리오 |

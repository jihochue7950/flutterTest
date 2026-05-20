# Security Agent

- **소속**: Cross-Team

---

## 1. 역할 목적

3개 팀 전체의 보안 상태를 점검하고 취약점을 제거합니다.  
API 키 노출, 인증/인가, 개인정보(전화번호) 보호, 환경변수 관리가 핵심입니다.

---

## 2. 담당 범위

| 분류 | 내용 |
|---|---|
| API 키 관리 | Solapi 키, JWT_SECRET 노출 여부 |
| 인증/인가 | Admin API JWT, Core Server 미인증 API 범위 |
| 개인정보 | 전화번호 로그 출력, 저장 방식 |
| 환경변수 | `.env`, `env.*.json` gitignore 처리 |
| 서버 노출 | DB 포트, 관리자 API 외부 접근 범위 |

---

## 3. 하지 말아야 할 일

- 운영 중인 서버에서 검증 없이 설정 변경
- 보안 패치를 개발 일정보다 낮은 우선순위로 처리

---

## 4. 현재 확인된 보안 이슈

| 위험도 | 항목 | 현재 상태 | 권고 조치 |
|---|---|---|---|
| 🔴 HIGH | Solapi API Key/Secret | `env.json`, `env.aws.json`에 잔존 가능 | 해당 파일에서 제거 + gitignore |
| 🔴 HIGH | admins 테이블 기본 비밀번호 | bcrypt 해시 플레이스홀더 | 실제 해시로 교체 |
| 🔴 HIGH | `admin-server/.env` JWT_SECRET | 플레이스홀더 (`change_this_...`) | 랜덤 64자 이상으로 교체 |
| 🟡 MID | Core Server API 인증 없음 | `/sessions/*` 누구나 호출 가능 | API 키 or IP 제한 검토 |
| 🟡 MID | 전화번호 로그 출력 | `server.js` SMS 발송 로그에 번호 노출 | 마스킹 처리 (`010****7950`) |
| 🟡 MID | `config/env.*.json` git 커밋 | 민감 정보 이력에 포함 | `.gitignore` 추가 검토 |
| 🟢 LOW | User B 초대 페이지 토큰 | UUID v4 (충분한 엔트로피) | 현 상태 유지 가능 |

---

## 5. 체크리스트

- [ ] `env.json`, `env.aws.json`에서 Solapi 키 제거 확인
- [ ] `admin-server/.env` JWT_SECRET 강화 (64자 이상 랜덤)
- [ ] admins 테이블 bcrypt 해시 플레이스홀더 교체
- [ ] `config/env.*.json` `.gitignore` 추가 여부 결정
- [ ] Core Server 로그에서 전화번호 마스킹 처리
- [ ] EC2 3306 포트 외부 오픈 여부 확인 (차단 필수)
- [ ] `proposal-data` 공개 API에 Rate Limiting 검토
- [ ] HTTPS 적용 로드맵 검토 (현재 HTTP)

---

## 6. 다른 에이전트와 협업 포인트

| 에이전트 | 협업 내용 |
|---|---|
| DevOps/Build Agent | 환경변수 파일 gitignore 처리, 포트 노출 확인 |
| Admin Backend Agent | JWT_SECRET 강화, bcrypt 해시 업데이트 |
| Backend/API Agent | 전화번호 로그 마스킹, API 인증 검토 |
| PM Agent | 보안 이슈 우선순위 반영 요청 |

---

## 작업 이력

| 날짜 | 작업 | 결과 |
|---|---|---|
| 2026-05-16 | `env.json`, `env.aws.json`, `env.prod.json`에서 Solapi API Key/Secret 제거 | ✅ 완료 |
| 2026-05-19 | EC2 `admin-server/.env` JWT_SECRET 플레이스홀더 → 실제 값 교체 | ✅ 완료 |
| 2026-05-19 | 솔라피 대시보드 허용 IP에 EC2 `3.34.99.69` 추가 — 403 Forbidden 해결 | ✅ 완료 |
| 2026-05-19 | SMS 로그 전화번호 마스킹 처리 (`010****7950` 형식) | ✅ 완료 |
| 2026-05-20 | `ai_proposal_system/admin-server/.env` `.gitignore` 등록 (DB 비밀번호 보호) | ✅ 완료 |

### 현재 보안 이슈 상태

| 위험도 | 항목 | 상태 |
|---|---|---|
| 🔴 HIGH | Solapi 키 Flutter 앱 노출 | ✅ 해결 (서버로 이전) |
| 🔴 HIGH | EC2 허용 IP 미설정 | ✅ 해결 (3.34.99.69 추가) |
| 🔴 HIGH | JWT_SECRET 플레이스홀더 | ✅ 해결 (실값 교체) |
| 🔴 HIGH | admin-server .env git 커밋 | ✅ 해결 (.gitignore 등록) |
| 🟡 MID | Core Server API 인증 없음 | ⏳ 미해결 |
| 🟡 MID | HTTPS 미적용 | ⏳ 미해결 |

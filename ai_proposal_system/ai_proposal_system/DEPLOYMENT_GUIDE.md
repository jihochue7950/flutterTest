# AI 제안 시스템 - 관리자 웹사이트 배포 가이드

## 1. AWS EC2 보안그룹 포트 오픈

EC2 콘솔 → 인스턴스 → 보안그룹 → 인바운드 규칙 편집:

| 유형 | 프로토콜 | 포트 | 소스 |
|------|---------|------|------|
| 사용자 지정 TCP | TCP | 8080 | 0.0.0.0/0 |
| SSH | TCP | 22 | 내 IP |
| MySQL/Aurora | TCP | 3306 | 127.0.0.1/32 (로컬만) |

## 2. MySQL 설정

```sql
-- MySQL 접속 후 실행
mysql -u root -p

-- 데이터베이스 및 테이블 생성
source /home/ec2-user/ai-proposal-system/schema.sql;

-- 기본 관리자 비밀번호 변경 (bcrypt 해시 생성 필요)
-- Node.js로 해시 생성:
-- node -e "const bcrypt=require('bcrypt'); bcrypt.hash('새비밀번호',10).then(h=>console.log(h))"
UPDATE admins SET password = '새_bcrypt_해시값' WHERE username = 'admin';
```

## 3. .env 파일 설정

`admin-server/.env` 파일을 실제 값으로 수정:

```
PORT=8080
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=실제DB비밀번호
DB_NAME=ai_proposal
JWT_SECRET=랜덤_긴_문자열_여기에입력
JWT_EXPIRES_IN=24h
VIDEO_UPLOAD_PATH=/var/www/ai-proposal/videos
SERVER_BASE_URL=http://EC2_퍼블릭_IP:8080
```

## 4. 배포 명령어

```bash
# EC2 서버에 파일 업로드 (로컬에서)
scp -r ./ai_proposal_system ec2-user@EC2_IP:/home/ec2-user/ai-proposal-system

# EC2 접속
ssh ec2-user@EC2_IP

# 배포 스크립트 실행
chmod +x /home/ec2-user/ai-proposal-system/deploy.sh
bash /home/ec2-user/ai-proposal-system/deploy.sh
```

## 5. 수동 배포 단계

```bash
# 영상 디렉토리 생성
sudo mkdir -p /var/www/ai-proposal/videos
sudo chown -R ec2-user:ec2-user /var/www/ai-proposal

# 백엔드
cd ~/ai-proposal-system/admin-server
npm install
# .env 파일 편집: nano .env

# 프론트엔드 빌드
cd ~/ai-proposal-system/admin-client
npm install
npm run build

# PM2로 시작
cd ~/ai-proposal-system/admin-server
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 6. PM2 관리 명령어

```bash
pm2 status                    # 상태 확인
pm2 logs ai-proposal-admin    # 로그 확인
pm2 restart ai-proposal-admin # 재시작
pm2 stop ai-proposal-admin    # 중지
pm2 delete ai-proposal-admin  # 삭제
```

## 7. 영상 업로드 테스트

```bash
# curl로 로그인 테스트
curl -X POST http://EC2_IP:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin1234"}'

# 응답에서 token 추출 후 사용자 목록 조회
TOKEN="여기에_토큰입력"
curl http://EC2_IP:8080/api/users \
  -H "Authorization: Bearer $TOKEN"

# 영상 업로드 테스트
curl -X POST http://EC2_IP:8080/api/users/1/videos \
  -H "Authorization: Bearer $TOKEN" \
  -F "video=@/path/to/test.mp4"

# proposal-data API 테스트 (인증 불필요)
curl http://EC2_IP:8080/api/users/user_a/proposal-data
```

## 8. 기본 관리자 계정

- ID: `admin`
- PW: `admin1234`

**반드시 첫 로그인 후 비밀번호를 변경하세요.**

비밀번호 변경 방법:
```bash
node -e "const bcrypt=require('bcrypt'); bcrypt.hash('새비밀번호',10).then(h=>console.log(h))"
# 출력된 해시를 복사

mysql -u root -p ai_proposal
UPDATE admins SET password = '복사한해시' WHERE username = 'admin';
```

## 9. 기존 백엔드 서버 연동

기존 Node.js 백엔드에서 `proposal-data-example.js`를 참고해 다음 환경변수를 추가:

```
ADMIN_SERVER_URL=http://localhost:8080
```

같은 EC2 인스턴스라면 localhost를 사용하고,
다른 인스턴스라면 내부 IP(Private IP)를 사용하면 외부 노출 없이 통신 가능합니다.

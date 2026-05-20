#!/bin/bash
# AWS EC2 배포 스크립트
# Amazon Linux 2 / Ubuntu 기준

set -e

echo "=== AI Proposal Admin System 배포 시작 ==="

# 1. 프로젝트 업로드 후 이 경로에 있다고 가정
PROJECT_DIR="/home/ec2-user/ai-proposal-system"

# 2. 영상 저장 디렉토리 생성
echo "[1] 영상 저장 디렉토리 설정..."
sudo mkdir -p /var/www/ai-proposal/videos
sudo chown -R ec2-user:ec2-user /var/www/ai-proposal
chmod 755 /var/www/ai-proposal/videos

# 3. Node.js 설치 확인 (없으면 설치)
if ! command -v node &> /dev/null; then
  echo "[2] Node.js 설치..."
  curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
  sudo yum install -y nodejs
fi

# 4. PM2 전역 설치
if ! command -v pm2 &> /dev/null; then
  echo "[3] PM2 설치..."
  sudo npm install -g pm2
fi

# 5. 백엔드 의존성 설치
echo "[4] 백엔드 의존성 설치..."
cd "$PROJECT_DIR/admin-server"
npm install --production

# 6. 프론트엔드 빌드
echo "[5] 프론트엔드 빌드..."
cd "$PROJECT_DIR/admin-client"
npm install
npm run build

# 7. 로그 디렉토리 생성
mkdir -p /home/ec2-user/logs

# 8. PM2로 서버 시작
echo "[6] PM2 서버 시작..."
cd "$PROJECT_DIR/admin-server"
pm2 start ecosystem.config.js --env production
pm2 save

# 9. 시스템 재시작 시 PM2 자동 실행
pm2 startup systemd -u ec2-user --hp /home/ec2-user

echo ""
echo "=== 배포 완료 ==="
echo "관리자 페이지: http://$(curl -s ifconfig.me):8080"
echo ""
echo "PM2 상태 확인: pm2 status"
echo "로그 확인: pm2 logs ai-proposal-admin"

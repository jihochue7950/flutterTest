#!/bin/bash
# ============================================================
# FLUTTERPROJECT EC2 배포 스크립트
#
# 사용법:
#   ./deploy.sh           → server + ai_proposal_system 모두 배포
#   ./deploy.sh server    → server 만 배포
#   ./deploy.sh admin     → ai_proposal_system 만 배포
#
# 주의:
#   - ecosystem.config.js 는 EC2 실값이 따로 관리되므로 배포 제외
#   - .env 파일도 배포 제외 (EC2에서 직접 관리)
#   - SSH 연결은 ~/.ssh/config 의 'flutterproject' alias 사용
#     (pem 키 별도 지정 불필요)
# ============================================================

EC2=flutterproject   # ~/.ssh/config alias
TARGET=${1:-all}

echo "🚀 FLUTTERPROJECT 배포 시작 (target: $TARGET)"
echo ""

deploy_server() {
  echo "── [1/2] server/ 배포 ──────────────────────────────"
  scp \
    server/server.js \
    server/local_server.js \
    server/package.json \
    "$EC2":/home/ubuntu/server/

  echo "   npm install (신규 패키지 있을 경우)"
  ssh "$EC2" "cd /home/ubuntu/server && npm install --production 2>&1 | tail -3"

  echo "   pm2 restart ai-proposal-server"
  ssh "$EC2" "cd /home/ubuntu/server && pm2 restart ai-proposal-server && sleep 2 && pm2 status"

  echo "   ✅ server 배포 완료"
}

deploy_admin() {
  echo "── [2/2] ai_proposal_system/ 배포 ─────────────────"
  scp -r \
    ai_proposal_system/ai_proposal_system/admin-server/src \
    ai_proposal_system/ai_proposal_system/admin-server/package.json \
    "$EC2":/home/ubuntu/ai_proposal_system/admin-server/

  echo "   admin-client 빌드 중..."
  (cd ai_proposal_system/ai_proposal_system/admin-client && npm run build 2>&1 | tail -5)

  scp -r \
    ai_proposal_system/ai_proposal_system/admin-client/build \
    "$EC2":/home/ubuntu/ai_proposal_system/admin-client/

  echo "   npm install + pm2 restart ai-proposal-admin"
  ssh "$EC2" "cd /home/ubuntu/ai_proposal_system/admin-server && npm install --production 2>&1 | tail -3 && pm2 restart ai-proposal-admin && sleep 2 && pm2 status"

  echo "   ✅ admin 배포 완료"
}

case "$TARGET" in
  server) deploy_server ;;
  admin)  deploy_admin  ;;
  all)    deploy_server; deploy_admin ;;
  *)      echo "사용법: ./deploy.sh [server|admin|all]"; exit 1 ;;
esac

echo ""
echo "🎉 배포 완료!"
echo ""
echo "── 상태 확인 ──────────────────────────────────────"
curl -s http://3.34.99.69:3000/health
echo ""

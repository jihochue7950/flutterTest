/**
 * PM2 프로세스 관리 설정
 *
 * PM2: Node.js 앱을 백그라운드에서 실행하고 크래시 시 자동 재시작합니다.
 *
 * 사용법:
 *   pm2 start ecosystem.config.js      # 서버 시작
 *   pm2 stop ai-proposal-server        # 서버 중지
 *   pm2 restart ai-proposal-server     # 서버 재시작
 *   pm2 logs ai-proposal-server        # 로그 확인
 *   pm2 status                         # 실행 중인 프로세스 목록
 *
 * EC2 재부팅 후 자동 시작 설정:
 *   pm2 startup    (나오는 명령어를 복사 후 실행)
 *   pm2 save
 */

module.exports = {
  apps: [
    {
      // 앱 이름 (pm2 명령어에서 이 이름으로 참조)
      name: 'ai-proposal-server',

      // 실행할 파일
      script: './server.js',

      // 환경변수 설정
      env: {
        NODE_ENV:     'production',
        PORT_API:     '3000',    // API + WebSocket 포트
        PORT_INVITE:  '4000',    // User B 초대 페이지 포트
        // ★ 반드시 실제 EC2 퍼블릭 IP 또는 도메인으로 변경하세요!
        PUBLIC_HOST:  'YOUR_EC2_PUBLIC_IP',
      },

      // 크래시 시 자동 재시작
      autorestart: true,

      // 파일 변경 감지 후 자동 재시작 (운영에서는 false 권장)
      watch: false,

      // 메모리가 이 이상이면 자동 재시작
      max_memory_restart: '512M',

      // 로그 파일 경로
      out_file:   './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',

      // 최대 재시작 횟수 (무한 루프 방지)
      max_restarts: 10,
      min_uptime:   '5s', // 5초 이상 실행되어야 정상으로 간주
    },
  ],
};

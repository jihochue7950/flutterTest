/**
 * PM2 프로세스 관리 설정
 *
 * ★ 이 파일은 git에 커밋되는 템플릿입니다.
 *   EC2 서버에서는 실제 값으로 교체하여 사용합니다.
 *   민감한 실제 값(비밀번호, API 키)은 절대 이 파일에 직접 입력하지 마세요.
 *
 * 사용법:
 *   pm2 start ecosystem.config.js      # 서버 시작
 *   pm2 restart ai-proposal-server     # 재시작
 *   pm2 logs ai-proposal-server        # 로그 확인
 *   pm2 status                         # 프로세스 목록
 *
 * EC2 재부팅 후 자동 시작:
 *   pm2 startup  →  나오는 명령어 실행
 *   pm2 save
 */

module.exports = {
  apps: [
    {
      name:   'ai-proposal-server',
      script: './server.js',
      env: {
        NODE_ENV:     'production',
        PORT_API:     '3000',
        PORT_INVITE:  '4000',

        // EC2 퍼블릭 IP 또는 도메인
        PUBLIC_HOST:  'YOUR_EC2_PUBLIC_IP',
        // admin-system이 영상을 서빙하는 호스트 (보통 PUBLIC_HOST와 동일)
        VIDEO_HOST:   'YOUR_EC2_PUBLIC_IP',

        // MariaDB 접속 정보
        DB_HOST:      'localhost',
        DB_PORT:      '3306',
        DB_USER:      'YOUR_DB_USER',
        DB_PASSWORD:  'YOUR_DB_PASSWORD',
        DB_NAME:      'ai_proposal',

        // Solapi SMS (Flutter 앱 대신 서버에서 직접 발송)
        SOLAPI_API_KEY:    'YOUR_SOLAPI_API_KEY',
        SOLAPI_API_SECRET: 'YOUR_SOLAPI_API_SECRET',
        SOLAPI_FROM:       'YOUR_FROM_NUMBER',
      },

      autorestart:        true,
      watch:              false,
      max_memory_restart: '512M',
      out_file:           './logs/out.log',
      error_file:         './logs/error.log',
      log_date_format:    'YYYY-MM-DD HH:mm:ss',
      max_restarts:       10,
      min_uptime:         '5s',
    },
  ],
};

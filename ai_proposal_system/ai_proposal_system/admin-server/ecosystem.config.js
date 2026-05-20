module.exports = {
  apps: [
    {
      name: 'ai-proposal-admin',
      script: 'src/server.js',
      cwd: '/home/ec2-user/ai-proposal-system/admin-server',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 8080,
      },
      error_file: '/home/ec2-user/logs/admin-error.log',
      out_file: '/home/ec2-user/logs/admin-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};

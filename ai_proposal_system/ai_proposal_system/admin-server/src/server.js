const app = require('./app');
const db = require('./config/db');
require('dotenv').config();

const PORT = process.env.PORT || 8080;

async function start() {
  try {
    const conn = await db.getConnection();
    conn.release();
    console.log('MySQL 연결 성공');

    app.listen(PORT, () => {
      console.log(`AI Proposal Admin Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('서버 시작 실패:', err);
    process.exit(1);
  }
}

start();

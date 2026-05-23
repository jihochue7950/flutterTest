'use strict';
require('dotenv').config({ path: '.env.local' });

const app  = require('./app');
const db   = require('./config/db');

const PORT = parseInt(process.env.PORT || '5000', 10);

(async () => {
  try {
    await db.query('SELECT 1');
    console.log('[vc-api] DB 연결 성공');
  } catch (err) {
    console.warn('[vc-api] DB 연결 실패 (오프라인 모드):', err.message);
  }

  app.listen(PORT, () => {
    console.log(`\n[vc-api] Team D — AI 영상 제작 서버`);
    console.log(`[vc-api] http://localhost:${PORT}`);
    console.log('[vc-api] 로컬 개발 모드 (EC2 미배포)\n');
  });
})();

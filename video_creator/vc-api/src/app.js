'use strict';

const express    = require('express');
const cors       = require('cors');
const path       = require('path');

const projectsRoutes  = require('./routes/projects.routes');
const photosRoutes    = require('./routes/photos.routes');
const musicRoutes     = require('./routes/music.routes');
const scenarioRoutes  = require('./routes/scenario.routes');
const renderRoutes    = require('./routes/render.routes');
const adminRoutes     = require('./routes/admin.routes');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 정적 파일 서빙 (업로드된 사진/음악/영상)
const uploadBase = process.env.UPLOAD_BASE_PATH || path.join(__dirname, '../uploads');
app.use('/uploads',      express.static(uploadBase));
app.use('/music-library', express.static(path.join(uploadBase, 'music-library')));

// ── 공개 API ──────────────────────────────────────
app.use('/api/video-projects',  projectsRoutes);   // 프로젝트 CRUD
app.use('/api/video-projects',  photosRoutes);     // 사진 업로드/정렬
app.use('/api/video-projects',  musicRoutes);      // 음악 선택/업로드
app.use('/api/video-projects',  scenarioRoutes);   // 시나리오 생성
app.use('/api/video-projects',  renderRoutes);     // 렌더링 시작/상태
app.use('/api/music-library',   musicRoutes);      // 음악 라이브러리 조회

// ── 관리자 API ────────────────────────────────────
app.use('/api/admin', adminRoutes);

// 헬스체크
app.get('/health', (req, res) => res.json({
  status: 'ok',
  team:   'D',
  service: 'vc-api',
}));

// 글로벌 에러 핸들러
app.use((err, req, res, next) => {
  console.error('[vc-api] 오류:', err.message);
  res.status(err.status || 500).json({ success: false, message: err.message || '서버 오류' });
});

module.exports = app;

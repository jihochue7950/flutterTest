const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');
const videosRoutes = require('./routes/videos.routes');
const videoDirectRoutes = require('./routes/videos.direct.routes');
const questionsRoutes = require('./routes/questions.routes');
const questionDirectRoutes = require('./routes/questions.direct.routes');
const proposalRoutes = require('./routes/proposal.routes');

// 신규: 상품 / 주문 라우트
const productsPublicRoutes = require('./routes/products.routes');
const productsAdminRoutes = require('./routes/products.admin.routes');
const ordersPublicRoutes = require('./routes/orders.routes');
const ordersAdminRoutes = require('./routes/orders.admin.routes');

const { uploadPath } = require('./config/upload');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 정적 파일: 업로드된 영상
app.use('/videos', express.static(uploadPath));

// ─────────────────────────────────────────
// 공개 API (인증 불필요)
// ─────────────────────────────────────────
app.use('/api/products', productsPublicRoutes);
app.use('/api/orders', ordersPublicRoutes);

// Team B 전용 proposal-data (기존 유지)
app.use('/api/users', proposalRoutes);

// ─────────────────────────────────────────
// 관리자 API (JWT 필요)
// ─────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/admin/users', usersRoutes);
app.use('/api/admin/users/:id/videos', videosRoutes);
app.use('/api/admin/videos', videoDirectRoutes);
app.use('/api/admin/users/:id/questions', questionsRoutes);
app.use('/api/admin/questions', questionDirectRoutes);
app.use('/api/admin/products', productsAdminRoutes);
app.use('/api/admin/orders', ordersAdminRoutes);

// ─────────────────────────────────────────
// React SPA (admin-client build)
// ─────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../../admin-client/build')));

app.get('*', (req, res) => {
  const buildPath = path.join(__dirname, '../../admin-client/build/index.html');
  if (require('fs').existsSync(buildPath)) {
    res.sendFile(buildPath);
  } else {
    res.json({ message: 'AI Proposal Server is running.' });
  }
});

// 전역 에러 핸들러
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: err.message || '서버 오류' });
});

module.exports = app;

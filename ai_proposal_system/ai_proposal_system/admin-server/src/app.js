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

const { uploadPath } = require('./config/upload');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static video files
app.use('/videos', express.static(uploadPath));

// Admin client build (after running npm run build in admin-client)
app.use(express.static(path.join(__dirname, '../../admin-client/build')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/users/:id/videos', videosRoutes);
app.use('/api/videos', videoDirectRoutes);
app.use('/api/users/:id/questions', questionsRoutes);
app.use('/api/questions', questionDirectRoutes);
app.use('/api/users', proposalRoutes);

// Fallback to React app
app.get('*', (req, res) => {
  const buildPath = path.join(__dirname, '../../admin-client/build/index.html');
  if (require('fs').existsSync(buildPath)) {
    res.sendFile(buildPath);
  } else {
    res.json({ message: 'AI Proposal Admin Server is running.' });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: err.message || '서버 오류' });
});

module.exports = app;

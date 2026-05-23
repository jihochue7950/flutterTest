'use strict';

const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const { v4: uuidv4 } = require('uuid');

const base = process.env.UPLOAD_BASE_PATH || path.join(__dirname, '../../uploads');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ── 사진 업로더 (jpg/png, 최대 20MB/장) ──────────────────────────────────────
const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(base, 'photos');
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}_${uuidv4().slice(0, 8)}${ext}`);
  },
});

const photoFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('jpg, png 파일만 업로드 가능합니다.'), false);
};

const photoUpload = multer({
  storage:    photoStorage,
  fileFilter: photoFilter,
  limits:     { fileSize: 20 * 1024 * 1024 }, // 20MB
});

// ── 음악 업로더 (mp3/wav, 최대 50MB) ─────────────────────────────────────────
const musicStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(base, 'music');
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}_${uuidv4().slice(0, 8)}${ext}`);
  },
});

const musicFilter = (req, file, cb) => {
  const allowed = ['audio/mpeg', 'audio/wav', 'audio/wave', 'audio/x-wav', 'audio/mp3'];
  const allowedExt = ['.mp3', '.wav'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(file.mimetype) || allowedExt.includes(ext)) cb(null, true);
  else cb(new Error('mp3, wav 파일만 업로드 가능합니다.'), false);
};

const musicUpload = multer({
  storage:    musicStorage,
  fileFilter: musicFilter,
  limits:     { fileSize: 50 * 1024 * 1024 }, // 50MB
});

module.exports = { photoUpload, musicUpload, uploadBase: base };

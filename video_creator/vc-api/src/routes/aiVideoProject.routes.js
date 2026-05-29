'use strict';

const router  = require('express').Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { v4: uuidv4 } = require('uuid');
const ctrl    = require('../controllers/aiVideoProject.controller');

// 임시 업로드 디렉토리 (controller에서 최종 위치로 이동)
const tmpDir = path.join(process.env.UPLOAD_BASE_PATH || path.join(__dirname, '../../uploads'), 'tmp');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

const imageUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, tmpDir),
    filename:    (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${uuidv4()}${ext}`);
    },
  }),
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'].includes(file.mimetype);
    ok ? cb(null, true) : cb(new Error('이미지 파일(jpg, png, webp)만 업로드 가능합니다.'), false);
  },
  limits: { fileSize: 20 * 1024 * 1024 },
});

// ── 프로젝트 ──────────────────────────────────────────────────────────────────
router.get ('/',                    ctrl.listProjects);
router.post('/', imageUpload.single('character_sheet'), ctrl.createProject);
router.get ('/:id',                 ctrl.getProject);
router.delete('/:id',              ctrl.deleteProject);
router.post('/:id/character-sheet', imageUpload.single('character_sheet'), ctrl.uploadCharacterSheet);

// ── 장면 ──────────────────────────────────────────────────────────────────────
router.post  ('/:id/scenes',        ctrl.addScene);

// ── 생성 제어 ────────────────────────────────────────────────────────────────
router.post  ('/:id/generate',      ctrl.generateProject);
router.get   ('/:id/status',        ctrl.getStatus);
router.post  ('/:id/finalize',      ctrl.finalizeProject);

module.exports = router;

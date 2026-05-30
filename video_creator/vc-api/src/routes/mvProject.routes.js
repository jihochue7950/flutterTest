'use strict';
const router = require('express').Router();
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const { v4: uuidv4 } = require('uuid');
const ctrl   = require('../controllers/mvProject.controller');

const tmpDir = path.join(process.env.UPLOAD_BASE_PATH || path.join(__dirname, '../../uploads'), 'tmp');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_, __, cb) => cb(null, tmpDir),
    filename:    (_, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

// 프로젝트
router.get ('/',    ctrl.listProjects);
router.post('/',    upload.fields([{ name: 'music', maxCount: 1 }, { name: 'character_sheet', maxCount: 1 }]), ctrl.createProject);
router.get ('/:id', ctrl.getProject);
router.get ('/:id/status', ctrl.getStatus);

// 단계별
router.post('/:id/transcribe',         ctrl.transcribeLyrics);   // 1→2: 가사 추출
router.put ('/:id/lyrics',             ctrl.saveLyrics);          // 2: 가사 수정
router.post('/:id/breakdown',          ctrl.breakdownScenes);     // 2→3: 장면 분리
router.put ('/:id/scenes/:sceneId',    ctrl.updateScene);         // 3: 장면 수정
router.put ('/:id/images/:imageId/prompt', ctrl.updateImagePrompt); // 3: 이미지 프롬프트 수정
router.post('/:id/generate-images',    ctrl.generateImages);      // 3→4: 이미지 생성
router.post('/:id/images/:imageId/regenerate', ctrl.regenerateImage); // 4: 특정 이미지 재생성
router.post('/:id/generate-videos',   ctrl.generateVideos);      // 4→5: 영상 클립 생성
router.post('/:id/merge',             ctrl.mergeProject);         // 5: 최종 합치기

module.exports = router;

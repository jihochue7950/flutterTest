'use strict';

const router = require('express').Router();
const { musicUpload } = require('../config/upload');
const { getMusicLibrary, selectLibraryMusic, uploadCustomMusic, getProjectMusic } = require('../controllers/music.controller');

// 음악 라이브러리 목록 (app.js에서 /api/music-library 에 마운트)
router.get('/', getMusicLibrary);

// 프로젝트 음악 (app.js에서 /api/video-projects 에 마운트)
router.get( '/:id/music',         getProjectMusic);
router.post('/:id/music/select',  selectLibraryMusic);
router.post('/:id/music/upload',  musicUpload.single('music'), uploadCustomMusic);

module.exports = router;

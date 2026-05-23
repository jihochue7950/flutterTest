'use strict';

const router = require('express').Router();
const VideoProjectModel = require('../models/video_project.model');
const RenderJobModel    = require('../models/render_job.model');
const { startRender }   = require('../controllers/render.controller');

const ok  = (res, data, msg = '성공') => res.json({ success: true, message: msg, data });
const err = (res, msg, code = 500) => res.status(code).json({ success: false, message: msg });

// GET  /api/admin/video-projects
router.get('/video-projects', async (req, res) => {
  try {
    const result = await VideoProjectModel.findAll(req.query);
    return ok(res, result);
  } catch (e) { return err(res, '목록 조회 실패'); }
});

// GET  /api/admin/video-projects/:id
router.get('/video-projects/:id', async (req, res) => {
  try {
    const p = await VideoProjectModel.findById(req.params.id);
    if (!p) return err(res, '없음', 404);
    return ok(res, p);
  } catch (e) { return err(res, '조회 실패'); }
});

// POST /api/admin/video-projects/:id/render  (렌더링 시작)
router.post('/video-projects/:id/render', startRender);

// GET  /api/admin/render-jobs
router.get('/render-jobs', async (req, res) => {
  try {
    const jobs = await RenderJobModel.findAll();
    return ok(res, jobs);
  } catch (e) { return err(res, '렌더 작업 조회 실패'); }
});

module.exports = router;

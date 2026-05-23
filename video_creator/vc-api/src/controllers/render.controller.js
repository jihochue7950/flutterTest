'use strict';

const VideoProjectModel = require('../models/video_project.model');
const RenderJobModel    = require('../models/render_job.model');
const MusicLibraryModel = require('../models/music_library.model');
const ProjectPhotoModel = require('../models/project_photo.model');
const FfmpegService     = require('../services/ffmpeg-render.service');

const ok  = (res, data, msg = '성공', code = 200) => res.status(code).json({ success: true, message: msg, data });
const err = (res, msg = '오류', code = 500) => res.status(code).json({ success: false, message: msg });

// POST /api/admin/video-projects/:id/render  — 관리자가 렌더링 시작
const startRender = async (req, res) => {
  try {
    const project = await VideoProjectModel.findById(req.params.id);
    if (!project) return err(res, '프로젝트 없음', 404);
    if (!project.scene_json) return err(res, 'Scene JSON이 없습니다. 먼저 시나리오를 생성하세요.', 400);
    if (['rendering', 'render_queued'].includes(project.status)) {
      return err(res, '이미 렌더링 중입니다.', 409);
    }

    const job = await RenderJobModel.create(project.id, 'admin');
    await VideoProjectModel.updateStatus(project.id, 'render_queued');

    // 비동기로 렌더링 실행 (응답은 즉시 반환)
    _runRender(project, job).catch(console.error);

    return ok(res, { job_id: job.id, status: 'render_queued' }, '렌더링이 시작되었습니다.');
  } catch (e) {
    console.error('startRender:', e.message);
    return err(res, '렌더링 시작 실패');
  }
};

// GET /api/video-projects/:id/render-status
const getRenderStatus = async (req, res) => {
  try {
    const job = await RenderJobModel.findByProject(req.params.id);
    if (!job) return ok(res, { status: 'none' });
    return ok(res, {
      job_id:    job.id,
      status:    job.status,
      progress:  job.progress,
      output:    job.output_path,
      error:     job.error_message,
      started:   job.started_at,
      completed: job.completed_at,
    });
  } catch (e) {
    return err(res, '렌더 상태 조회 실패');
  }
};

// GET /api/video-projects/:id/download
const getDownloadUrl = async (req, res) => {
  try {
    const project = await VideoProjectModel.findById(req.params.id);
    if (!project) return err(res, '프로젝트 없음', 404);
    if (!project.output_video_url) return err(res, '완성 영상이 아직 없습니다.', 404);
    return ok(res, { download_url: project.output_video_url });
  } catch (e) {
    return err(res, '다운로드 URL 조회 실패');
  }
};

// 실제 렌더링 실행 (비동기)
async function _runRender(project, job) {
  try {
    await RenderJobModel.start(job.id);
    await VideoProjectModel.updateStatus(project.id, 'rendering');

    const photos = await ProjectPhotoModel.findByProject(project.id);
    const music  = await MusicLibraryModel.getProjectMusic(project.id);
    const sceneJson = typeof project.scene_json === 'string'
      ? JSON.parse(project.scene_json)
      : project.scene_json;

    const outputPath = await FfmpegService.render({
      projectId:  project.id,
      sceneJson,
      photos,
      music,
      onProgress: async (pct) => { await RenderJobModel.updateProgress(job.id, pct); },
    });

    const outputUrl = `${process.env.SERVER_BASE_URL || 'http://localhost:5000'}/uploads/rendered/${require('path').basename(outputPath)}`;
    await RenderJobModel.complete(job.id, outputPath);
    await VideoProjectModel.updateStatus(project.id, 'done', { output_video_url: outputUrl });
    console.log(`[render] 완료 → ${outputPath}`);
  } catch (e) {
    console.error('[render] 실패:', e.message);
    await RenderJobModel.fail(job.id, e.message);
    await VideoProjectModel.updateStatus(project.id, 'failed');
  }
}

module.exports = { startRender, getRenderStatus, getDownloadUrl };

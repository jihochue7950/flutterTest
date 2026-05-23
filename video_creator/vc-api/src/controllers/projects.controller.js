'use strict';

const VideoProjectModel = require('../models/video_project.model');

const ok  = (res, data, msg = '성공', code = 200) => res.status(code).json({ success: true, message: msg, data });
const err = (res, msg = '오류', code = 500) => res.status(code).json({ success: false, message: msg });

// POST /api/video-projects
const createProject = async (req, res) => {
  try {
    const { event_type, style, title, order_id, user_code } = req.body;
    if (!event_type || !style) return err(res, 'event_type, style 은 필수입니다.', 400);
    const project = await VideoProjectModel.create({ event_type, style, title, order_id, user_code });
    return ok(res, project, '영상 제작 프로젝트가 생성되었습니다.', 201);
  } catch (e) {
    console.error('createProject:', e.message);
    return err(res, '프로젝트 생성 실패');
  }
};

// GET /api/video-projects/:id
const getProject = async (req, res) => {
  try {
    const project = await VideoProjectModel.findById(req.params.id);
    if (!project) return err(res, '프로젝트를 찾을 수 없습니다.', 404);
    return ok(res, project);
  } catch (e) {
    return err(res, '프로젝트 조회 실패');
  }
};

// GET /api/video-projects/:id/status
const getStatus = async (req, res) => {
  try {
    const project = await VideoProjectModel.findById(req.params.id);
    if (!project) return err(res, '프로젝트를 찾을 수 없습니다.', 404);
    return ok(res, {
      id:               project.id,
      status:           project.status,
      output_video_url: project.output_video_url,
      preview_url:      project.preview_url,
    });
  } catch (e) {
    return err(res, '상태 조회 실패');
  }
};

// GET /api/video-projects/:id/preview-json
const getPreviewJson = async (req, res) => {
  try {
    const project = await VideoProjectModel.findById(req.params.id);
    if (!project) return err(res, '프로젝트를 찾을 수 없습니다.', 404);
    if (!project.scene_json) return err(res, 'Scene JSON이 아직 생성되지 않았습니다.', 404);
    return ok(res, {
      scene_json:     typeof project.scene_json === 'string'
                        ? JSON.parse(project.scene_json)
                        : project.scene_json,
      ai_scenario:    project.ai_scenario,
      total_duration: project.total_duration,
    });
  } catch (e) {
    return err(res, 'Scene JSON 조회 실패');
  }
};

module.exports = { createProject, getProject, getStatus, getPreviewJson };

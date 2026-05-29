'use strict';

const path               = require('path');
const fs                 = require('fs');
const AiVideoProject     = require('../models/ai_video_project.model');
const AiVideoScene       = require('../models/ai_video_scene.model');
const videoProjectService = require('../services/videoProjectService');

const ok  = (res, data, msg = '성공', code = 200) => res.status(code).json({ success: true, message: msg, data });
const err = (res, msg = '오류', code = 500)       => res.status(code).json({ success: false, message: msg });

const BASE_UPLOAD = () => process.env.UPLOAD_BASE_PATH || path.join(__dirname, '../../uploads');
const SERVER_BASE = () => process.env.SERVER_BASE_URL   || 'http://localhost:5000';

// ── 프로젝트 CRUD ─────────────────────────────────────────────────────────────

// GET /api/admin/ai-video-projects
const listProjects = async (req, res) => {
  try {
    const result = await AiVideoProject.findAll(req.query);
    return ok(res, result);
  } catch (e) { return err(res, e.message); }
};

// GET /api/admin/ai-video-projects/:id
const getProject = async (req, res) => {
  try {
    const project = await AiVideoProject.findById(req.params.id);
    if (!project) return err(res, '프로젝트 없음', 404);
    const scenes  = await AiVideoScene.findByProject(req.params.id);
    return ok(res, { ...project, scenes });
  } catch (e) { return err(res, e.message); }
};

// POST /api/admin/ai-video-projects  (multer: character_sheet 처리 후)
const createProject = async (req, res) => {
  try {
    const { title, description, fal_model, global_prompt, character_description } = req.body;
    if (!title) return err(res, '제목은 필수입니다.', 400);

    const project = await AiVideoProject.create({ title, description, fal_model, global_prompt, character_description });

    // 캐릭터 시트 업로드 (있을 때)
    if (req.file) {
      const dir = path.join(BASE_UPLOAD(), 'video-projects', String(project.id));
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const ext     = path.extname(req.file.originalname).toLowerCase();
      const dest    = path.join(dir, `character-sheet${ext}`);
      fs.renameSync(req.file.path, dest);   // tmp → 최종 경로로 이동

      const rel = dest.replace(BASE_UPLOAD(), '').replace(/\\/g, '/');
      await AiVideoProject.updateCharacterSheet(project.id, {
        character_sheet_path: dest,
        character_sheet_url:  `${SERVER_BASE()}/uploads${rel}`,
      });
    }

    const updated = await AiVideoProject.findById(project.id);
    return ok(res, updated, '프로젝트 생성 완료', 201);
  } catch (e) { console.error(e); return err(res, e.message); }
};

// POST /api/admin/ai-video-projects/:id/character-sheet  (캐릭터 시트 별도 업로드)
const uploadCharacterSheet = async (req, res) => {
  try {
    if (!req.file) return err(res, '파일이 없습니다.', 400);
    const project = await AiVideoProject.findById(req.params.id);
    if (!project) return err(res, '프로젝트 없음', 404);

    const dir = path.join(BASE_UPLOAD(), 'video-projects', String(project.id));
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const ext  = path.extname(req.file.originalname).toLowerCase();
    const dest = path.join(dir, `character-sheet${ext}`);
    fs.renameSync(req.file.path, dest);

    const rel = dest.replace(BASE_UPLOAD(), '').replace(/\\/g, '/');
    const updated = await AiVideoProject.updateCharacterSheet(project.id, {
      character_sheet_path: dest,
      character_sheet_url:  `${SERVER_BASE()}/uploads${rel}`,
    });
    return ok(res, updated, '캐릭터 시트 업로드 완료');
  } catch (e) { return err(res, e.message); }
};

// DELETE /api/admin/ai-video-projects/:id
const deleteProject = async (req, res) => {
  try {
    await AiVideoProject.delete(req.params.id);
    return ok(res, null, '삭제 완료');
  } catch (e) { return err(res, e.message); }
};

// ── 장면 생성 / 수정 / 삭제 ───────────────────────────────────────────────────

// POST /api/admin/ai-video-projects/:id/scenes
const addScene = async (req, res) => {
  try {
    const { scene_order, scenario, duration_seconds, clothing, background, direction } = req.body;
    if (!scenario) return err(res, 'scenario는 필수입니다.', 400);

    const scenes = await AiVideoScene.findByProject(req.params.id);
    if (scenes.length >= 50) return err(res, '장면은 최대 50개까지 입력 가능합니다.', 400);

    // scene_order 미지정 시 자동 부여
    const order = scene_order != null ? parseInt(scene_order) : (scenes.length + 1);

    const scene = await AiVideoScene.create({
      project_id: req.params.id,
      scene_order: order,
      scenario, duration_seconds, clothing, background, direction,
    });
    return ok(res, scene, '장면 추가 완료', 201);
  } catch (e) { return err(res, e.message); }
};

// PUT /api/admin/ai-video-scenes/:id
const updateScene = async (req, res) => {
  try {
    const updated = await AiVideoScene.update(req.params.id, req.body);
    return ok(res, updated, '장면 수정 완료');
  } catch (e) { return err(res, e.message); }
};

// DELETE /api/admin/ai-video-scenes/:id
const deleteScene = async (req, res) => {
  try {
    await AiVideoScene.delete(req.params.id);
    return ok(res, null, '장면 삭제 완료');
  } catch (e) { return err(res, e.message); }
};

// ── 영상 생성 ─────────────────────────────────────────────────────────────────

// POST /api/admin/ai-video-projects/:id/generate
const generateProject = async (req, res) => {
  try {
    const project = await AiVideoProject.findById(req.params.id);
    if (!project) return err(res, '프로젝트 없음', 404);
    if (!project.character_sheet_url) return err(res, '캐릭터 시트를 먼저 업로드하세요.', 400);
    if (project.status === 'generating') return err(res, '이미 생성 중입니다.', 409);

    const scenes = await AiVideoScene.findByProject(req.params.id);
    if (scenes.length === 0) return err(res, '장면을 1개 이상 입력하세요.', 400);

    // 즉시 응답 반환 후 백그라운드에서 순차 생성
    res.json({ success: true, message: '영상 생성을 시작했습니다.', data: { projectId: project.id, status: 'generating' } });

    // 백그라운드 실행 (await 없음)
    videoProjectService.generateAllScenes(project.id).catch(console.error);
  } catch (e) { return err(res, e.message); }
};

// POST /api/admin/ai-video-scenes/:id/regenerate  (단일 장면 재생성)
const regenerateScene = async (req, res) => {
  try {
    res.json({ success: true, message: '재생성을 시작했습니다.' });
    videoProjectService.regenerateScene(req.params.id).catch(console.error);
  } catch (e) { return err(res, e.message); }
};

// GET /api/admin/ai-video-projects/:id/status  (폴링용)
const getStatus = async (req, res) => {
  try {
    const project = await AiVideoProject.findById(req.params.id);
    if (!project) return err(res, '없음', 404);
    const scenes  = await AiVideoScene.findByProject(req.params.id);
    return ok(res, {
      id:               project.id,
      status:           project.status,
      total_scenes:     project.total_scenes,
      completed_scenes: project.completed_scenes,
      final_video_url:  project.final_video_url,
      scenes:           scenes.map(s => ({
        id: s.id, scene_order: s.scene_order, status: s.status,
        video_url: s.video_url, error_message: s.error_message,
      })),
    });
  } catch (e) { return err(res, e.message); }
};

// POST /api/admin/ai-video-projects/:id/finalize
const finalizeProject = async (req, res) => {
  try {
    const project = await AiVideoProject.findById(req.params.id);
    if (!project) return err(res, '없음', 404);

    res.json({ success: true, message: '최종 영상 합치기를 시작했습니다.' });
    videoProjectService.finalizeProject(project.id).catch(console.error);
  } catch (e) { return err(res, e.message); }
};

module.exports = {
  listProjects, getProject, createProject, uploadCharacterSheet, deleteProject,
  addScene, updateScene, deleteScene,
  generateProject, regenerateScene, getStatus, finalizeProject,
};

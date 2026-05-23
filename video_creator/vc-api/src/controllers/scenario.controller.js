'use strict';

const VideoProjectModel  = require('../models/video_project.model');
const ProjectPhotoModel  = require('../models/project_photo.model');
const AiScenarioService  = require('../services/ai-scenario.service');
const SceneJsonService   = require('../services/scene-json.service');

const ok  = (res, data, msg = '성공', code = 200) => res.status(code).json({ success: true, message: msg, data });
const err = (res, msg = '오류', code = 500) => res.status(code).json({ success: false, message: msg });

// POST /api/video-projects/:id/scenario
// body: { user_scenario?: string, generate_ai?: boolean }
const saveScenario = async (req, res) => {
  try {
    const { user_scenario, generate_ai } = req.body;
    const project = await VideoProjectModel.findById(req.params.id);
    if (!project) return err(res, '프로젝트 없음', 404);

    let ai_scenario = project.ai_scenario;
    let scene_json  = project.scene_json;

    // AI 시나리오 생성 요청
    if (generate_ai) {
      await VideoProjectModel.updateStatus(req.params.id, 'ai_generating');
      const photos = await ProjectPhotoModel.findByProject(req.params.id);

      // 1. Claude API로 시나리오 생성
      ai_scenario = await AiScenarioService.generateScenario({
        event_type:    project.event_type,
        style:         project.style,
        user_scenario: user_scenario || '',
        photo_count:   photos.length,
      });

      // 2. Scene JSON 생성
      scene_json = await SceneJsonService.generateSceneJson({
        project,
        photos,
        ai_scenario,
      });
    }

    const updated = await VideoProjectModel.updateScenario(req.params.id, {
      user_scenario: user_scenario || undefined,
      ai_scenario:   ai_scenario   || undefined,
      scene_json:    scene_json    || undefined,
      status:        generate_ai ? 'ai_done' : undefined,
    });

    return ok(res, {
      user_scenario: updated.user_scenario,
      ai_scenario:   updated.ai_scenario,
      scene_json:    updated.scene_json
                       ? (typeof updated.scene_json === 'string'
                           ? JSON.parse(updated.scene_json)
                           : updated.scene_json)
                       : null,
      status:        updated.status,
    }, generate_ai ? 'AI 시나리오 생성 완료' : '시나리오 저장 완료');
  } catch (e) {
    console.error('saveScenario:', e.message);
    await VideoProjectModel.updateStatus(req.params.id, 'draft').catch(() => {});
    return err(res, `시나리오 생성 실패: ${e.message}`);
  }
};

module.exports = { saveScenario };

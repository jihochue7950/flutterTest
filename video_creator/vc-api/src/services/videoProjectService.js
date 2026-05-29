'use strict';

const path              = require('path');
const fs                = require('fs');
const AiVideoProject    = require('../models/ai_video_project.model');
const AiVideoScene      = require('../models/ai_video_scene.model');
const falVideoService   = require('./falVideoService');
const ffmpegService     = require('./aiVideoFfmpegService');

const BASE_UPLOAD = () => process.env.UPLOAD_BASE_PATH || path.join(__dirname, '../../uploads');
const SERVER_BASE = () => process.env.SERVER_BASE_URL   || 'http://localhost:5000';

/**
 * 프롬프트 빌드
 */
function buildPrompt(scene, isFirstScene) {
  const lines = [
    'Use the provided character sheet as the main character reference.',
    'Keep the same character identity, face, body proportions, and animation style across all scenes.',
  ];

  if (!isFirstScene) {
    lines.push(
      'This scene continues directly from the previous video.',
      'Keep the same character, same clothing, same background mood, and natural motion continuity from the previous scene.'
    );
  }

  lines.push(
    `Scene: ${scene.resolved_scenario || scene.scenario}`,
    `Duration: ${scene.duration_seconds} seconds.`,
    scene.resolved_clothing   ? `Clothing: ${scene.resolved_clothing}.`   : '',
    scene.resolved_background ? `Background: ${scene.resolved_background}.` : '',
    scene.direction           ? `Direction: ${scene.direction}.`           : '',
  );

  if (!isFirstScene) {
    lines.push('Maintain character consistency and visual continuity with the previous scene.');
  }

  return lines.filter(Boolean).join('\n');
}

/**
 * 프로젝트 디렉토리 구조 생성
 */
function ensureProjectDirs(projectId) {
  const base    = path.join(BASE_UPLOAD(), 'video-projects', String(projectId));
  const scenes  = path.join(base, 'scenes');
  const final   = path.join(base, 'final');
  [base, scenes, final].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });
  return { base, scenes, final };
}

/**
 * 전체 장면 순차 생성 (비동기 백그라운드 실행)
 * — HTTP 응답 후 백그라운드에서 실행됨
 */
async function generateAllScenes(projectId) {
  const project = await AiVideoProject.findById(projectId);
  if (!project) throw new Error('프로젝트 없음');

  const scenes  = await AiVideoScene.findByProject(projectId);
  const dirs    = ensureProjectDirs(projectId);

  await AiVideoProject.updateStatus(projectId, 'generating', { total_scenes: scenes.length, completed_scenes: 0 });

  let prevScene  = null;
  let doneCount  = 0;

  for (const scene of scenes) {
    // 1. 의상/배경 상속 처리
    const resolved = AiVideoScene.resolveFields(scene, prevScene);
    const resolvedScene = { ...scene, ...resolved };

    // 2. 프롬프트 빌드
    const isFirstScene = scene.scene_order === scenes[0].scene_order;
    const prompt       = buildPrompt(resolvedScene, isFirstScene);

    // 3. DB: generating 상태로 변경
    await AiVideoScene.updateGenerating(scene.id, { ...resolved, prompt });

    try {
      // 4. 이전 장면 마지막 프레임 URL
      const prevFrameUrl = prevScene?.last_frame_url || null;

      // 5. fal.ai API 호출 (또는 Mock)
      const { videoPath, videoUrl, falRequestId } = await falVideoService.generateVideo({
        prompt,
        characterSheetUrl: project.character_sheet_url,
        prevFrameUrl,
        durationSeconds:   scene.duration_seconds,
        sceneOrder:        scene.scene_order,
        outputDir:         dirs.scenes,
      });

      // 6. 마지막 프레임 추출
      let lastFramePath = null;
      let lastFrameUrl  = null;
      try {
        const framePath  = videoPath.replace(/\.mp4$/i, '_last_frame.png');
        lastFramePath    = await ffmpegService.extractLastFrame(videoPath, framePath);
        const relFrame   = lastFramePath.replace(BASE_UPLOAD(), '').replace(/\\/g, '/');
        lastFrameUrl     = `${SERVER_BASE()}/uploads${relFrame}`;
      } catch (e) {
        console.warn(`[videoProject] 마지막 프레임 추출 실패 (Scene ${scene.scene_order}):`, e.message);
      }

      // 7. DB: done 저장
      await AiVideoScene.updateDone(scene.id, { videoUrl, videoPath, lastFrameUrl, lastFramePath, falRequestId });
      await AiVideoProject.incrementCompleted(projectId);
      doneCount++;

      // 8. 다음 장면이 참조할 prevScene 업데이트
      prevScene = { ...resolvedScene, last_frame_url: lastFrameUrl };
      console.log(`[videoProject] Scene ${scene.scene_order} 완료 (${doneCount}/${scenes.length})`);

    } catch (err) {
      console.error(`[videoProject] Scene ${scene.scene_order} 실패:`, err.message);
      await AiVideoScene.updateFailed(scene.id, err.message);
      // 실패해도 prevScene 값은 유지 (다음 장면 상속 계속)
      prevScene = { ...resolvedScene, last_frame_url: prevScene?.last_frame_url };
    }
  }

  // 완료 상태 업데이트
  const allDone = doneCount === scenes.length;
  await AiVideoProject.updateStatus(projectId, allDone ? 'done' : 'failed', { completed_scenes: doneCount });
  console.log(`[videoProject] 프로젝트 ${projectId} 생성 완료: ${doneCount}/${scenes.length}`);
}

/**
 * 특정 장면 단독 재생성
 */
async function regenerateScene(sceneId) {
  const scene   = await AiVideoScene.findById(sceneId);
  if (!scene) throw new Error('장면 없음');
  const project = await AiVideoProject.findById(scene.project_id);
  const scenes  = await AiVideoScene.findByProject(scene.project_id);
  const dirs    = ensureProjectDirs(scene.project_id);

  // 이전 장면 조회 (scene_order가 현재보다 작은 마지막 장면)
  const prevScene = scenes
    .filter(s => s.scene_order < scene.scene_order && s.status === 'done')
    .sort((a, b) => b.scene_order - a.scene_order)[0] || null;

  const resolved    = AiVideoScene.resolveFields(scene, prevScene);
  const resolvedScene = { ...scene, ...resolved };
  const isFirst     = scenes[0].id === scene.id;
  const prompt      = buildPrompt(resolvedScene, isFirst);

  await AiVideoScene.resetStatus(sceneId);
  await AiVideoScene.updateGenerating(sceneId, { ...resolved, prompt });

  const { videoPath, videoUrl, falRequestId } = await falVideoService.generateVideo({
    prompt,
    characterSheetUrl: project.character_sheet_url,
    prevFrameUrl:      prevScene?.last_frame_url || null,
    durationSeconds:   scene.duration_seconds,
    sceneOrder:        scene.scene_order,
    outputDir:         dirs.scenes,
  });

  let lastFramePath = null, lastFrameUrl = null;
  try {
    const fp   = videoPath.replace(/\.mp4$/i, '_last_frame.png');
    lastFramePath = await ffmpegService.extractLastFrame(videoPath, fp);
    const rel  = lastFramePath.replace(BASE_UPLOAD(), '').replace(/\\/g, '/');
    lastFrameUrl  = `${SERVER_BASE()}/uploads${rel}`;
  } catch (e) { console.warn('[regenerate] 프레임 추출 실패:', e.message); }

  await AiVideoScene.updateDone(sceneId, { videoUrl, videoPath, lastFrameUrl, lastFramePath, falRequestId });
}

/**
 * 완성된 장면 영상들을 FFmpeg로 합쳐 최종 영상 생성
 */
async function finalizeProject(projectId) {
  const scenes  = await AiVideoScene.findByProject(projectId);
  const dirs    = ensureProjectDirs(projectId);
  const donePaths = scenes
    .filter(s => s.status === 'done' && s.video_path)
    .sort((a, b) => a.scene_order - b.scene_order)
    .map(s => s.video_path);

  if (donePaths.length === 0) throw new Error('완성된 장면이 없습니다.');

  const finalPath = path.join(dirs.final, 'final_video.mp4');
  await AiVideoProject.updateStatus(projectId, 'generating');

  await ffmpegService.concatScenes(donePaths, finalPath, (pct) => {
    console.log(`[finalize] ${projectId} - ${pct}%`);
  });

  const relPath  = finalPath.replace(BASE_UPLOAD(), '').replace(/\\/g, '/');
  const finalUrl = `${SERVER_BASE()}/uploads${relPath}`;

  await AiVideoProject.updateStatus(projectId, 'done', {
    final_video_path: finalPath,
    final_video_url:  finalUrl,
  });

  return { finalPath, finalUrl };
}

module.exports = { generateAllScenes, regenerateScene, finalizeProject, buildPrompt };

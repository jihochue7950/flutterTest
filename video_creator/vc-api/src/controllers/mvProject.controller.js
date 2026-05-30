'use strict';
const path             = require('path');
const fs               = require('fs');
const MvProject        = require('../models/mv_project.model');
const MvScene          = require('../models/mv_scene.model');
const MvImage          = require('../models/mv_image.model');
const whisperSvc       = require('../services/mv/whisperService');
const breakdownSvc     = require('../services/mv/sceneBreakdownService');
const imageGenSvc      = require('../services/mv/imageGenService');
const videoClipSvc     = require('../services/mv/videoClipService');
const musicMergeSvc    = require('../services/mv/musicMergeService');

const ok  = (res, data, msg = '성공', code = 200) => res.status(code).json({ success: true, message: msg, data });
const err = (res, msg = '오류', code = 500)       => res.status(code).json({ success: false, message: msg });

const BASE  = () => process.env.UPLOAD_BASE_PATH || path.join(__dirname, '../../uploads');
const SBASE = () => process.env.SERVER_BASE_URL   || 'http://localhost:5001';

function ensureDirs(projectId) {
  const base = path.join(BASE(), 'mv-projects', String(projectId));
  ['scenes', 'images', 'final'].forEach(d => {
    const dir = path.join(base, d);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });
  return base;
}

// ── 프로젝트 목록 ──────────────────────────────────────────────────────────────
const listProjects = async (req, res) => {
  try { return ok(res, await MvProject.findAll(req.query)); }
  catch (e) { return err(res, e.message); }
};

// ── 프로젝트 상세 ──────────────────────────────────────────────────────────────
const getProject = async (req, res) => {
  try {
    const p = await MvProject.findById(req.params.id);
    if (!p) return err(res, '없음', 404);
    const scenes = await MvScene.findByProject(req.params.id);
    return ok(res, { ...p, scenes });
  } catch (e) { return err(res, e.message); }
};

// ── 1단계: 프로젝트 생성 + 파일 업로드 ────────────────────────────────────────
const createProject = async (req, res) => {
  try {
    const { title, global_style, character_desc } = req.body;
    if (!title) return err(res, '제목은 필수입니다.', 400);

    const project = await MvProject.create({ title, global_style, character_desc });
    const base    = ensureDirs(project.id);

    const files = req.files || {};

    // 음악 파일 저장
    if (files.music?.[0]) {
      const f    = files.music[0];
      const dest = path.join(base, `music${path.extname(f.originalname)}`);
      fs.renameSync(f.path, dest);
      const rel  = dest.replace(BASE(), '').replace(/\\/g, '/');
      await MvProject.updateMusic(project.id, {
        music_url:  `${SBASE()}/uploads${rel}`,
        music_path: dest,
        music_duration: 0, // ffprobe 없이 0으로 초기화
      });
    }

    // 캐릭터 시트 저장
    if (files.character_sheet?.[0]) {
      const f    = files.character_sheet[0];
      const ext  = path.extname(f.originalname).toLowerCase();
      const dest = path.join(base, `character-sheet${ext}`);
      fs.renameSync(f.path, dest);
      const rel  = dest.replace(BASE(), '').replace(/\\/g, '/');
      await MvProject.updateCharacterSheet(project.id, {
        character_sheet_url:  `${SBASE()}/uploads${rel}`,
        character_sheet_path: dest,
      });
    }

    const updated = await MvProject.findById(project.id);
    return ok(res, { ...updated, step: 'upload' }, '프로젝트가 생성되었습니다.', 201);
  } catch (e) { console.error(e); return err(res, e.message); }
};

// ── 2단계: 가사 자동 추출 (Whisper) ──────────────────────────────────────────
const transcribeLyrics = async (req, res) => {
  try {
    const p = await MvProject.findById(req.params.id);
    if (!p) return err(res, '없음', 404);
    if (!p.music_url) return err(res, '음악 파일을 먼저 업로드하세요.', 400);

    await MvProject.updateStep(p.id, 'transcribing');
    res.json({ success: true, message: '가사 추출을 시작했습니다.' });

    // 백그라운드 실행
    whisperSvc.transcribeAudio(p.music_url).then(async ({ text }) => {
      await MvProject.updateLyrics(p.id, { lyrics_raw: text, lyrics_edited: text, step: 'lyrics_review' });
      console.log(`[MV] 프로젝트 ${p.id} 가사 추출 완료`);
    }).catch(async e => {
      await MvProject.updateStep(p.id, 'failed');
      console.error('[MV] 가사 추출 실패:', e.message);
    });
  } catch (e) { return err(res, e.message); }
};

// ── 가사 수정 저장 ─────────────────────────────────────────────────────────────
const saveLyrics = async (req, res) => {
  try {
    const { lyrics_edited } = req.body;
    const updated = await MvProject.updateLyrics(req.params.id, {
      lyrics_edited, step: 'lyrics_review'
    });
    return ok(res, updated, '가사가 저장되었습니다.');
  } catch (e) { return err(res, e.message); }
};

// ── 3단계: 장면 자동 분리 (Claude) ────────────────────────────────────────────
const breakdownScenes = async (req, res) => {
  try {
    const p = await MvProject.findById(req.params.id);
    if (!p) return err(res, '없음', 404);
    const lyrics = p.lyrics_edited || p.lyrics_raw;
    if (!lyrics) return err(res, '가사를 먼저 입력하세요.', 400);

    const { images_per_scene = 2 } = req.body;
    await MvProject.updateStep(p.id, 'breaking_down');
    res.json({ success: true, message: '장면 분리를 시작했습니다.' });

    breakdownSvc.breakdownLyrics({
      lyrics,
      duration:      p.music_duration || 180,
      globalStyle:   p.global_style,
      characterDesc: p.character_desc,
      imagesPerScene: parseInt(images_per_scene),
    }).then(async ({ scenes }) => {
      // DB에 장면 저장
      await MvScene.bulkCreate(p.id, scenes.map(s => ({
        scene_order: s.scene_order, time_start: s.time_start, time_end: s.time_end,
        theme: s.theme, emotion: s.emotion, lyrics_segment: s.lyrics_segment,
      })));

      // 이미지 프롬프트 저장
      const savedScenes = await MvScene.findByProject(p.id);
      for (const dbScene of savedScenes) {
        const aiScene = scenes.find(s => s.scene_order === dbScene.scene_order);
        if (aiScene?.images) {
          await MvImage.bulkCreateForScene(p.id, dbScene.id, aiScene.images.map(img => ({
            image_order: img.image_order, prompt: img.prompt, video_duration: img.video_duration || 5,
          })));
        }
      }
      await MvProject.updateStep(p.id, 'scene_review');
      console.log(`[MV] 프로젝트 ${p.id} 장면 분리 완료`);
    }).catch(async e => {
      await MvProject.updateStep(p.id, 'failed');
      console.error('[MV] 장면 분리 실패:', e.message);
    });
  } catch (e) { return err(res, e.message); }
};

// ── 장면 수정 ─────────────────────────────────────────────────────────────────
const updateScene = async (req, res) => {
  try {
    await MvScene.update(req.params.sceneId, req.body);
    return ok(res, null, '장면이 수정되었습니다.');
  } catch (e) { return err(res, e.message); }
};

// ── 이미지 프롬프트 수정 ────────────────────────────────────────────────────────
const updateImagePrompt = async (req, res) => {
  try {
    const { prompt } = req.body;
    await require('../models/mv_image.model').updateImageResult(req.params.imageId, {
      image_url: null, image_path: null, image_status: 'pending', image_error: null, fal_request_id: null,
    });
    const db = require('../config/db');
    await db.query('UPDATE mv_images SET prompt=?, updated_at=NOW() WHERE id=?', [prompt, req.params.imageId]);
    return ok(res, null, '프롬프트가 수정되었습니다.');
  } catch (e) { return err(res, e.message); }
};

// ── 4단계: 이미지 생성 (FLUX Kontext) ────────────────────────────────────────
const generateImages = async (req, res) => {
  try {
    const p = await MvProject.findById(req.params.id);
    if (!p) return err(res, '없음', 404);
    await MvProject.updateStep(p.id, 'generating_images');
    res.json({ success: true, message: '이미지 생성을 시작했습니다.' });
    _runImageGeneration(p).catch(console.error);
  } catch (e) { return err(res, e.message); }
};

async function _runImageGeneration(project) {
  const base   = path.join(BASE(), 'mv-projects', String(project.id), 'images');
  const images = await MvImage.findByProject(project.id);
  let done = 0;

  for (const img of images) {
    if (img.image_status === 'done') { done++; continue; } // 이미 생성된 것 스킵
    try {
      await MvImage.updateImageResult(img.id, { image_url: null, image_path: null, image_status: 'generating', image_error: null, fal_request_id: null });
      const outPath = path.join(base, `img_${img.id}.png`);
      const result  = await imageGenSvc.generateImage({
        prompt: img.prompt,
        characterSheetUrl: project.character_sheet_url,
        globalStyle: project.global_style,
        outputPath: outPath,
      });
      const rel = outPath.replace(BASE(), '').replace(/\\/g, '/');
      await MvImage.updateImageResult(img.id, {
        image_url: `${SBASE()}/uploads${rel}`,
        image_path: outPath, image_status: 'done',
        image_error: null, fal_request_id: result.requestId,
      });
      done++;
    } catch (e) {
      await MvImage.updateImageResult(img.id, { image_url: null, image_path: null, image_status: 'failed', image_error: e.message, fal_request_id: null });
    }
  }
  await MvProject.updateStep(project.id, 'image_review');
  console.log(`[MV] 이미지 생성 완료 ${done}/${images.length}`);
}

// ── 특정 이미지 재생성 ─────────────────────────────────────────────────────────
const regenerateImage = async (req, res) => {
  try {
    const img = await MvImage.findById(req.params.imageId);
    if (!img) return err(res, '없음', 404);
    const p   = await MvProject.findById(img.project_id);
    await MvImage.resetImage(img.id);
    res.json({ success: true, message: '이미지 재생성을 시작했습니다.' });

    const base    = path.join(BASE(), 'mv-projects', String(img.project_id), 'images');
    const outPath = path.join(base, `img_${img.id}.png`);
    imageGenSvc.generateImage({ prompt: img.prompt, characterSheetUrl: p.character_sheet_url, globalStyle: p.global_style, outputPath: outPath })
      .then(async result => {
        const rel = outPath.replace(BASE(), '').replace(/\\/g, '/');
        await MvImage.updateImageResult(img.id, { image_url: `${SBASE()}/uploads${rel}`, image_path: outPath, image_status: 'done', image_error: null, fal_request_id: result.requestId });
      }).catch(async e => {
        await MvImage.updateImageResult(img.id, { image_url: null, image_path: null, image_status: 'failed', image_error: e.message, fal_request_id: null });
      });
  } catch (e) { return err(res, e.message); }
};

// ── 5단계: 영상 클립 생성 (Kling) ────────────────────────────────────────────
const generateVideos = async (req, res) => {
  try {
    const p = await MvProject.findById(req.params.id);
    if (!p) return err(res, '없음', 404);
    await MvProject.updateStep(p.id, 'generating_videos');
    res.json({ success: true, message: '영상 생성을 시작했습니다.' });
    _runVideoGeneration(p).catch(console.error);
  } catch (e) { return err(res, e.message); }
};

async function _runVideoGeneration(project) {
  const base   = path.join(BASE(), 'mv-projects', String(project.id), 'scenes');
  const images = await MvImage.findByProject(project.id);
  for (const img of images) {
    if (img.video_status === 'done' || img.image_status !== 'done') continue;
    try {
      await MvImage.updateVideoResult(img.id, { video_url: null, video_path: null, video_status: 'generating', video_error: null });
      const outPath = path.join(base, `vid_${img.id}.mp4`);
      const result  = await videoClipSvc.imageToVideo({
        imageUrl: img.image_url, imagePath: img.image_path,
        prompt: `${img.prompt}, gentle motion, smooth animation`,
        durationSeconds: img.video_duration || 5,
        outputPath: outPath,
      });
      await MvImage.updateVideoResult(img.id, { video_url: result.videoUrl, video_path: result.videoPath, video_status: 'done', video_error: null });
    } catch (e) {
      await MvImage.updateVideoResult(img.id, { video_url: null, video_path: null, video_status: 'failed', video_error: e.message });
    }
  }
  await MvProject.updateStep(project.id, 'image_review'); // 검토 화면으로 복귀
  console.log(`[MV] 프로젝트 ${project.id} 영상 클립 생성 완료`);
}

// ── 최종 합치기 (FFmpeg) ─────────────────────────────────────────────────────
const mergeProject = async (req, res) => {
  try {
    const p = await MvProject.findById(req.params.id);
    if (!p) return err(res, '없음', 404);
    await MvProject.updateStep(p.id, 'merging');
    res.json({ success: true, message: '최종 영상 합치기를 시작했습니다.' });

    const images     = await MvImage.findByProject(p.id);
    const videoPaths = images
      .filter(i => i.video_status === 'done' && i.video_path)
      .sort((a, b) => a.scene_id - b.scene_id || a.image_order - b.image_order)
      .map(i => i.video_path);

    const finalPath = path.join(BASE(), 'mv-projects', String(p.id), 'final', 'final_video.mp4');

    musicMergeSvc.mergeVideoAndMusic(videoPaths, p.music_path, finalPath, () => {})
      .then(async () => {
        const rel = finalPath.replace(BASE(), '').replace(/\\/g, '/');
        await MvProject.updateStep(p.id, 'done', {
          final_video_url:  `${SBASE()}/uploads${rel}`,
          final_video_path: finalPath,
        });
        console.log(`[MV] 프로젝트 ${p.id} 최종 영상 완료`);
      }).catch(async e => {
        await MvProject.updateStep(p.id, 'failed');
        console.error('[MV] 합치기 실패:', e.message);
      });
  } catch (e) { return err(res, e.message); }
};

// ── 상태 폴링 ─────────────────────────────────────────────────────────────────
const getStatus = async (req, res) => {
  try {
    const p = await MvProject.findById(req.params.id);
    if (!p) return err(res, '없음', 404);
    const scenes = await MvScene.findByProject(req.params.id);
    const images = await MvImage.findByProject(req.params.id);
    return ok(res, {
      id: p.id, step: p.step, title: p.title,
      music_duration: p.music_duration,
      final_video_url: p.final_video_url,
      images_total: images.length,
      images_done:  images.filter(i => i.image_status === 'done').length,
      videos_done:  images.filter(i => i.video_status === 'done').length,
      scenes_count: scenes.length,
    });
  } catch (e) { return err(res, e.message); }
};

module.exports = {
  listProjects, getProject, createProject,
  transcribeLyrics, saveLyrics,
  breakdownScenes, updateScene, updateImagePrompt,
  generateImages, regenerateImage,
  generateVideos,
  mergeProject, getStatus,
};

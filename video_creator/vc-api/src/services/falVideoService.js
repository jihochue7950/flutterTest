'use strict';

const path        = require('path');
const fs          = require('fs');
const https       = require('https');
const http        = require('http');
const ffmpeg      = require('fluent-ffmpeg');
const ffmpegPath  = require('ffmpeg-static');

if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);

const FAL_KEY   = () => process.env.FAL_KEY || '';
const FAL_MODEL = () => process.env.FAL_MODEL || 'fal-ai/kling-video/v1/pro';

/**
 * fal.ai API로 영상 생성
 * FAL_KEY 없으면 → ffmpeg Mock 영상 자동 생성
 *
 * @param {object} params
 * @param {string} params.prompt          - 최종 프롬프트
 * @param {string} params.characterSheetUrl - 캐릭터 시트 URL
 * @param {string|null} params.prevFrameUrl - 이전 장면 마지막 프레임 URL
 * @param {number} params.durationSeconds
 * @param {number} params.sceneOrder
 * @param {string} params.outputDir       - 저장 경로
 * @returns {Promise<{videoPath, videoUrl, falRequestId}>}
 */
async function generateVideo({ prompt, characterSheetUrl, prevFrameUrl, durationSeconds, sceneOrder, outputDir }) {
  const filename    = `scene_${String(sceneOrder).padStart(3, '0')}.mp4`;
  const outputPath  = path.join(outputDir, filename);
  const serverBase  = process.env.SERVER_BASE_URL || 'http://localhost:5000';

  if (!FAL_KEY()) {
    console.log(`[fal] FAL_KEY 없음 → Mock 영상 생성 (Scene ${sceneOrder})`);
    await _generateMockVideo({ sceneOrder, prompt, durationSeconds, outputPath });
    const relUrl = outputPath.replace(process.env.UPLOAD_BASE_PATH || '', '').replace(/\\/g, '/');
    return { videoPath: outputPath, videoUrl: `${serverBase}/uploads${relUrl}`, falRequestId: null };
  }

  // 실제 fal.ai 호출
  const { fal } = require('@fal-ai/client');
  fal.config({ credentials: FAL_KEY() });

  const model = FAL_MODEL();
  console.log(`[fal] 실제 API 호출: ${model} / Scene ${sceneOrder}`);

  // 모델별 입력 구조
  const input = _buildFalInput({ model, prompt, characterSheetUrl, prevFrameUrl, durationSeconds });

  const result = await fal.subscribe(model, {
    input,
    logs: true,
    onQueueUpdate: (update) => {
      if (update.status === 'IN_PROGRESS') console.log(`[fal] Scene ${sceneOrder} 생성 중...`);
    },
  });

  // 결과 영상 URL 파싱 (모델마다 응답 구조 다름)
  const generatedUrl = _parseVideoUrl(result, model);
  if (!generatedUrl) throw new Error('fal.ai 응답에서 영상 URL을 찾을 수 없습니다.');

  // 영상 다운로드 후 서버에 저장
  await _downloadFile(generatedUrl, outputPath);
  const relUrl = outputPath.replace(process.env.UPLOAD_BASE_PATH || '', '').replace(/\\/g, '/');

  return {
    videoPath:    outputPath,
    videoUrl:     `${serverBase}/uploads${relUrl}`,
    falRequestId: result.requestId || null,
  };
}

// ── 모델별 입력 구조 빌드 ──────────────────────────────────────────────────────
function _buildFalInput({ model, prompt, characterSheetUrl, prevFrameUrl, durationSeconds }) {
  const base = { prompt, duration: durationSeconds };

  if (model.includes('kling-video/o1/reference')) {
    // Kling O1: reference_images 배열
    const refs = [characterSheetUrl, prevFrameUrl].filter(Boolean);
    return { ...base, reference_images: refs };
  }

  if (model.includes('kling-video')) {
    // Kling V1/V2/V3: image_url (이전 프레임 우선, 없으면 캐릭터 시트)
    return { ...base, image_url: prevFrameUrl || characterSheetUrl };
  }

  if (model.includes('wan')) {
    // WAN: reference_images 배열
    return { ...base, image_url: prevFrameUrl || characterSheetUrl };
  }

  // 기본
  return { ...base, image_url: prevFrameUrl || characterSheetUrl };
}

// ── 응답에서 videoUrl 파싱 ────────────────────────────────────────────────────
function _parseVideoUrl(result, model) {
  // 일반적인 응답 구조들
  return result?.video?.url
      || result?.output?.video?.url
      || result?.videos?.[0]?.url
      || result?.url
      || null;
}

// ── Mock: 기존 영상 파일 복사 (메모리 절약) ──────────────────────────────────
// EC2에 기존 영상이 있으면 복사, 없으면 최소 MP4 파일 생성
const MOCK_SOURCE_PATHS = [
  '/var/www/ai-proposal/videos/1778829475816_e8660170.mp4',
  '/var/www/ai-proposal/videos/1778827295918_1476c53b.mp4',
];

async function _generateMockVideo({ sceneOrder, prompt, durationSeconds, outputPath }) {
  // 기존 영상 파일 복사 (ffmpeg 없이)
  for (const src of MOCK_SOURCE_PATHS) {
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, outputPath);
      console.log(`[fal] Mock 영상 복사 완료: Scene ${sceneOrder} ← ${path.basename(src)}`);
      return;
    }
  }

  // 기존 파일 없으면 최소 유효 MP4 바이너리 생성
  // ftyp + mdat 헤더만 있는 5초짜리 최소 MP4 (재생 불가하지만 파일로는 유효)
  const minMp4 = Buffer.from(
    '000000206674797069736F6D0000020069736F6D69736F32617663316D703431' +
    '00000000' + // mdat box (empty)
    '6D646174',
    'hex'
  );
  fs.writeFileSync(outputPath, minMp4);
  console.log(`[fal] Mock 최소 MP4 생성: Scene ${sceneOrder}`);
}

// ── 파일 다운로드 ─────────────────────────────────────────────────────────────
function _downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const file  = fs.createWriteStream(dest);
    proto.get(url, (res) => {
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

module.exports = { generateVideo };

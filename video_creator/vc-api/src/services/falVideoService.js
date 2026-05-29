'use strict';

const path        = require('path');
const fs          = require('fs');
const https       = require('https');
const http        = require('http');
const ffmpeg      = require('fluent-ffmpeg');
const ffmpegPath  = require('ffmpeg-static');

if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);

const FAL_KEY   = () => process.env.FAL_KEY || '';
const FAL_MODEL = () => process.env.FAL_MODEL || 'fal-ai/kling-video/v1.6/pro';

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

  // 실제 fal.ai 호출 — queue.submit + 폴링 방식
  const { fal } = require('@fal-ai/client');
  fal.config({ credentials: FAL_KEY() });

  const baseModel = FAL_MODEL();
  const imageUrl  = prevFrameUrl || characterSheetUrl || null;
  const endpoint  = _resolveEndpoint(baseModel, !!imageUrl);
  console.log(`[fal] 실제 API 호출: ${endpoint} / Scene ${sceneOrder}`);

  const input = _buildFalInput({ model: endpoint, prompt, characterSheetUrl, prevFrameUrl, durationSeconds });

  // 1. 작업 제출
  const submitted = await fal.queue.submit(endpoint, { input });
  const requestId = submitted.request_id;
  console.log(`[fal] Scene ${sceneOrder} 제출 완료 (request_id: ${requestId})`);

  // 2. 완료까지 폴링 (최대 10분, 10초 간격)
  let result = null;
  const maxTries = 60;
  for (let i = 0; i < maxTries; i++) {
    await new Promise(r => setTimeout(r, 10000)); // 10초 대기
    const status = await fal.queue.status(endpoint, { requestId, logs: true });
    console.log(`[fal] Scene ${sceneOrder} 상태: ${status.status} (${i + 1}/${maxTries})`);
    if (status.status === 'COMPLETED') {
      result = await fal.queue.result(endpoint, { requestId });
      break;
    }
    if (status.status === 'FAILED') {
      throw new Error(`fal.ai 생성 실패: ${JSON.stringify(status.error || 'unknown')}`);
    }
  }
  if (!result) throw new Error('fal.ai 생성 타임아웃 (10분 초과)');

  // 3. 결과 영상 URL 파싱
  const generatedUrl = _parseVideoUrl(result, model);
  if (!generatedUrl) throw new Error(`fal.ai 응답에서 영상 URL 없음: ${JSON.stringify(result).slice(0,200)}`);

  console.log(`[fal] Scene ${sceneOrder} 영상 URL: ${generatedUrl.slice(0, 80)}`);

  // 4. 영상 다운로드 → 서버 저장
  await _downloadFile(generatedUrl, outputPath);
  const relUrl = outputPath.replace(process.env.UPLOAD_BASE_PATH || '', '').replace(/\\/g, '/');

  return {
    videoPath:    outputPath,
    videoUrl:     `${serverBase}/uploads${relUrl}`,
    falRequestId: requestId,
  };
}

// ── 엔드포인트 결정 (이미지 유무에 따라 text/image suffix) ──────────────────────
function _resolveEndpoint(model, hasImage) {
  if (model.includes('/text-to-video') || model.includes('/image-to-video') ||
      model.includes('o1/reference')) return model;
  if (model.includes('kling-video')) {
    return model + (hasImage ? '/image-to-video' : '/text-to-video');
  }
  return model;
}

// ── 모델별 입력 구조 빌드 ──────────────────────────────────────────────────────
function _buildFalInput({ model, prompt, characterSheetUrl, prevFrameUrl, durationSeconds }) {
  const imageUrl = prevFrameUrl || characterSheetUrl || null;
  const dur      = durationSeconds <= 5 ? '5' : '10'; // Kling은 문자열 '5' or '10'

  if (model.includes('o1/reference')) {
    const refs = [characterSheetUrl, prevFrameUrl].filter(Boolean);
    return { prompt, duration: dur, reference_images: refs };
  }

  if (model.includes('kling-video')) {
    const input = { prompt, duration: dur };
    if (imageUrl) {
      // v3 image-to-video는 start_image_url 사용
      input[model.includes('v3') && model.includes('image-to-video') ? 'start_image_url' : 'image_url'] = imageUrl;
    }
    return input;
  }

  return { prompt, ...(imageUrl ? { image_url: imageUrl } : {}) };
}

// ── 응답에서 videoUrl 파싱 (모델마다 구조 다름) ──────────────────────────────
function _parseVideoUrl(result, model) {
  // Kling, WAN 등 일반적인 구조
  return result?.video?.url
      || result?.output?.video?.url
      || result?.data?.video?.url
      || result?.videos?.[0]?.url
      || result?.url
      || (typeof result === 'string' && result.startsWith('http') ? result : null)
      || null;
}

// ── Mock: 플랫폼별 자동 전환 영상 생성 ──────────────────────────────────────
// ① lavfi 지원(Mac) → ② EC2 기존 파일 복사 → ③ 최소 MP4 바이너리
const MOCK_SOURCE_PATHS = [
  '/var/www/ai-proposal/videos/1778829475816_e8660170.mp4',
  '/var/www/ai-proposal/videos/1778827295918_1476c53b.mp4',
];

let _lavfiCache = null;
async function _testLavfi() {
  if (_lavfiCache !== null) return _lavfiCache;
  return new Promise(resolve => {
    const os = require('os');
    const tmp = path.join(os.tmpdir(), `lavfi_test_${Date.now()}.mp4`);
    ffmpeg()
      .input('color=c=black:size=32x32:duration=0.1').inputOptions(['-f lavfi'])
      .outputOptions(['-c:v libx264', '-pix_fmt yuv420p'])
      .output(tmp)
      .on('end', () => { fs.unlink(tmp, () => {}); _lavfiCache = true;  resolve(true);  })
      .on('error', () => {                           _lavfiCache = false; resolve(false); })
      .run();
  });
}

async function _generateMockVideo({ sceneOrder, durationSeconds, outputPath }) {
  // Mac (lavfi 지원): 텍스트 오버레이 실제 영상 생성
  if (await _testLavfi()) {
    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(`color=c=0x1a1a2e:size=1280x720:rate=24:duration=${durationSeconds}`)
        .inputOptions(['-f lavfi'])
        .videoFilter([
          `drawtext=text='Scene ${sceneOrder}':fontsize=60:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2`,
          `drawtext=text='MOCK MODE':fontsize=24:fontcolor=yellow:x=10:y=10`,
        ])
        .outputOptions(['-c:v libx264', '-pix_fmt yuv420p', '-an'])
        .output(outputPath)
        .on('end', () => { console.log(`[fal] Mock lavfi 완료: Scene ${sceneOrder}`); resolve(); })
        .on('error', (e) => reject(new Error(`Mock lavfi 실패: ${e.message}`)))
        .run();
    });
  }

  // EC2: 기존 영상 파일 복사
  for (const src of MOCK_SOURCE_PATHS) {
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, outputPath);
      console.log(`[fal] Mock 복사 완료: Scene ${sceneOrder}`);
      return;
    }
  }

  // 최소 MP4 바이너리 (파일 존재 확인용)
  fs.writeFileSync(outputPath,
    Buffer.from('000000206674797069736F6D0000020069736F6D69736F32617663316D703431000000006D646174', 'hex')
  );
  console.log(`[fal] Mock 최소 MP4: Scene ${sceneOrder}`);
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

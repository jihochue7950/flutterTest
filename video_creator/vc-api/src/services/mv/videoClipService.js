'use strict';
const path  = require('path');
const fs    = require('fs');
const https = require('https');
const http  = require('http');

// fal.ai Kling — 이미지 → 영상 클립 변환
async function imageToVideo({ imageUrl, imagePath, prompt, durationSeconds, outputPath }) {
  const FAL_KEY    = process.env.FAL_KEY || '';
  const MODEL_BASE = process.env.VIDEO_MODEL || 'fal-ai/kling-video/v1.6/pro';
  const ENDPOINT   = MODEL_BASE.includes('/image-to-video') ? MODEL_BASE : MODEL_BASE + '/image-to-video';

  if (!FAL_KEY) {
    console.warn('[VideoClip] FAL_KEY 없음 → Mock 영상 복사');
    return _mockVideo(outputPath, imagePath);
  }

  const { fal } = require('@fal-ai/client');
  fal.config({ credentials: FAL_KEY });

  // 로컬 이미지를 공개 URL로 업로드
  const publicImageUrl = await _toPublicUrl(imageUrl || imagePath, fal);
  if (!publicImageUrl) throw new Error('이미지 공개 URL 변환 실패');

  const dur = durationSeconds <= 5 ? '5' : '10';
  const motion = prompt || 'gentle animation, smooth movement, cinematic';

  console.log(`[VideoClip] ${ENDPOINT} 영상 생성 중... (${dur}초)`);
  const submitted = await fal.queue.submit(ENDPOINT, {
    input: { image_url: publicImageUrl, prompt: motion, duration: dur },
  });

  for (let i = 0; i < 36; i++) {
    await new Promise(r => setTimeout(r, 10000));
    const status = await fal.queue.status(ENDPOINT, { requestId: submitted.request_id });
    console.log(`[VideoClip] 상태: ${status.status} (${(i+1)*10}초)`);
    if (status.status === 'COMPLETED') {
      const result  = await fal.queue.result(ENDPOINT, { requestId: submitted.request_id });
      // fal.ai는 data 안에 넣는 경우가 있음 (imageGenService와 동일 패턴)
      const d = result?.data || result;
      const vidUrl = d?.video?.url
          || d?.output?.video?.url
          || d?.videos?.[0]?.url
          || result?.video?.url
          || result?.output?.video?.url
          || null;
      console.log('[VideoClip] 응답 키:', Object.keys(result || {}));
      if (!vidUrl) throw new Error(`영상 URL 없음. 응답: ${JSON.stringify(result).slice(0,300)}`);
      await _downloadFile(vidUrl, outputPath);
      const serverBase = process.env.SERVER_BASE_URL || 'http://localhost:5001';
      const uploadBase = process.env.UPLOAD_BASE_PATH || '';
      const relUrl = outputPath.replace(uploadBase, '').replace(/\\/g, '/');
      console.log(`[VideoClip] 영상 저장 완료: ${path.basename(outputPath)}`);
      return { videoPath: outputPath, videoUrl: `${serverBase}/uploads${relUrl}` };
    }
    if (status.status === 'FAILED') throw new Error(`영상 생성 실패: ${JSON.stringify(status.error)}`);
  }
  throw new Error('영상 생성 타임아웃');
}

async function _toPublicUrl(url, falClient) {
  if (url?.startsWith('https://')) return url;
  const serverBase = process.env.SERVER_BASE_URL || 'http://localhost:5001';
  const uploadBase = process.env.UPLOAD_BASE_PATH || path.join(__dirname, '../../../uploads');
  const localPath  = url?.startsWith('http://')
    ? path.join(uploadBase, url.replace(serverBase + '/uploads', ''))
    : (url || '');
  if (!localPath || !fs.existsSync(localPath)) return null;
  const buf  = fs.readFileSync(localPath);
  const ext  = path.extname(localPath).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
  return falClient.storage.upload(new Blob([buf], { type: mime }));
}

async function _mockVideo(outputPath, imagePath) {
  // EC2 기존 영상 복사 또는 최소 MP4
  const MOCK_SOURCES = [
    '/var/www/ai-proposal/videos/1778829475816_e8660170.mp4',
  ];
  for (const src of MOCK_SOURCES) {
    if (fs.existsSync(src)) { fs.copyFileSync(src, outputPath); break; }
  }
  if (!fs.existsSync(outputPath)) {
    fs.writeFileSync(outputPath, Buffer.from('000000206674797069736F6D', 'hex'));
  }
  const serverBase = process.env.SERVER_BASE_URL || 'http://localhost:5001';
  const uploadBase = process.env.UPLOAD_BASE_PATH || '';
  const relUrl = outputPath.replace(uploadBase, '').replace(/\\/g, '/');
  return { videoPath: outputPath, videoUrl: `${serverBase}/uploads${relUrl}` };
}

function _downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const file  = fs.createWriteStream(dest);
    proto.get(url, (res) => { res.pipe(file); file.on('finish', () => file.close(resolve)); })
         .on('error', err => { fs.unlink(dest, () => {}); reject(err); });
  });
}

module.exports = { imageToVideo };

'use strict';
const path    = require('path');
const fs      = require('fs');
const os      = require('os');
const https   = require('https');
const http    = require('http');
const ffmpeg  = require('fluent-ffmpeg');
const ffmpegP = require('ffmpeg-static');
if (ffmpegP) ffmpeg.setFfmpegPath(ffmpegP);

// fal.ai FLUX Kontext — 다중 캐릭터 시트 합성 + 프롬프트 → 이미지 생성
async function generateImage({ prompt, characterSheetUrls = [], characterSheetUrl, characterLocalPaths = [], globalStyle, outputPath }) {
  const FAL_KEY = process.env.FAL_KEY || '';
  const MODEL   = process.env.IMAGE_MODEL || 'fal-ai/flux-pro/kontext';

  const allUrls   = characterSheetUrls.length > 0 ? characterSheetUrls : (characterSheetUrl ? [characterSheetUrl] : []);
  const allPaths  = characterLocalPaths.filter(p => p && fs.existsSync(p));

  if (!FAL_KEY) {
    console.warn('[ImageGen] FAL_KEY 없음 → Mock 이미지 생성');
    return _mockImage(outputPath, prompt);
  }

  const { fal } = require('@fal-ai/client');
  fal.config({ credentials: FAL_KEY });

  // 캐릭터가 2명 이상이면 ffmpeg로 가로 합성 → 단일 레퍼런스 이미지 생성
  let referenceUrl = null;
  if (allPaths.length >= 2) {
    const combinedPath = path.join(os.tmpdir(), `combined_chars_${Date.now()}.png`);
    try {
      await _combineImages(allPaths, combinedPath);
      console.log(`[ImageGen] 캐릭터 ${allPaths.length}명 합성 완료`);
      const buf  = fs.readFileSync(combinedPath);
      referenceUrl = await fal.storage.upload(new Blob([buf], { type: 'image/png' }));
      fs.unlink(combinedPath, () => {});
      console.log(`[ImageGen] 합성 레퍼런스 업로드: ${referenceUrl.slice(0, 60)}...`);
    } catch (e) {
      console.warn('[ImageGen] 합성 실패, 첫 번째 시트만 사용:', e.message);
    }
  }

  // 합성 실패하거나 1명이면 첫 번째 시트 단독 사용
  if (!referenceUrl) {
    if (allPaths.length === 1) {
      const buf = fs.readFileSync(allPaths[0]);
      referenceUrl = await fal.storage.upload(new Blob([buf], { type: 'image/png' }));
    } else if (allUrls.length > 0) {
      referenceUrl = await _toPublicUrl(allUrls[0], fal);
    }
  }

  const fullPrompt = globalStyle ? `${globalStyle}. ${prompt}` : prompt;
  console.log(`[ImageGen] ${MODEL} 이미지 생성 중... (캐릭터 ${allPaths.length}명 합성 레퍼런스)`);

  const input = referenceUrl
    ? { prompt: fullPrompt, image_url: referenceUrl }
    : { prompt: fullPrompt };

  const submitted = await fal.queue.submit(MODEL, { input });
  const requestId = submitted.request_id;

  // 폴링 (최대 5분)
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 10000));
    const status = await fal.queue.status(MODEL, { requestId });
    console.log(`[ImageGen] 상태: ${status.status} (${(i+1)*10}초)`);
    if (status.status === 'COMPLETED') {
      let result;
      try {
        result = await fal.queue.result(MODEL, { requestId });
        console.log('[ImageGen] 응답 키:', Object.keys(result || {}));
        if (result?.images) console.log('[ImageGen] images[0]:', JSON.stringify(result.images[0]).slice(0,150));
        if (result?.data) console.log('[ImageGen] data 키:', Object.keys(result.data || {}));
      } catch (resultErr) {
        console.error('[ImageGen] result 호출 오류:', resultErr?.message, resultErr?.status, JSON.stringify(resultErr?.body || ''));
        throw new Error(`result 조회 실패: ${resultErr?.message || JSON.stringify(resultErr)}`);
      }
      const imgUrl = _parseImageUrl(result);
      if (!imgUrl) throw new Error(`이미지 URL 없음. 응답: ${JSON.stringify(result).slice(0,300)}`);

      await _downloadFile(imgUrl, outputPath);
      console.log(`[ImageGen] 이미지 저장 완료: ${path.basename(outputPath)}`);
      return { imagePath: outputPath, imageUrl: imgUrl, requestId };
    }
    if (status.status === 'FAILED') throw new Error(`이미지 생성 실패: ${JSON.stringify(status.error)}`);
  }
  throw new Error('이미지 생성 타임아웃');
}

// 여러 캐릭터 시트를 가로로 합성 (ffmpeg hstack)
function _combineImages(imagePaths, outputPath) {
  return new Promise((resolve, reject) => {
    const cmd = ffmpeg();
    imagePaths.forEach(p => cmd.input(p));
    const filter = imagePaths.map((_, i) => `[${i}:v]scale=512:-1[s${i}]`).join(';')
      + `;${imagePaths.map((_, i) => `[s${i}]`).join('')}hstack=inputs=${imagePaths.length}[out]`;
    cmd
      .complexFilter(filter)
      .outputOptions(['-map [out]'])
      .output(outputPath)
      .on('end', resolve)
      .on('error', (e) => reject(new Error(`합성 실패: ${e.message}`)))
      .run();
  });
}

function _parseImageUrl(result) {
  // fal.ai는 결과를 result.data 안에 넣는 경우가 있음
  const d = result?.data || result;
  return d?.images?.[0]?.url
      || d?.image?.url
      || d?.output?.image?.url
      || result?.images?.[0]?.url
      || result?.image?.url
      || null;
}

async function _toPublicUrl(url, falClient) {
  if (url?.startsWith('https://')) return url;
  const serverBase = process.env.SERVER_BASE_URL || 'http://localhost:5001';
  const uploadBase = process.env.UPLOAD_BASE_PATH || path.join(__dirname, '../../../uploads');
  const localPath  = url.startsWith('http://')
    ? path.join(uploadBase, url.replace(serverBase + '/uploads', ''))
    : url;
  if (!fs.existsSync(localPath)) return null;
  const buf   = fs.readFileSync(localPath);
  const ext   = path.extname(localPath).toLowerCase();
  const mime  = ext === '.png' ? 'image/png' : 'image/jpeg';
  const blob  = new Blob([buf], { type: mime });
  return falClient.storage.upload(blob);
}

async function _mockImage(outputPath, prompt) {
  // 1x1 픽셀 PNG (Mock)
  const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
  fs.writeFileSync(outputPath, PNG);
  console.log('[ImageGen] Mock 이미지 생성:', path.basename(outputPath));
  return { imagePath: outputPath, imageUrl: null, requestId: null };
}

function _downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const file  = fs.createWriteStream(dest);
    proto.get(url, (res) => { res.pipe(file); file.on('finish', () => file.close(resolve)); })
         .on('error', err => { fs.unlink(dest, () => {}); reject(err); });
  });
}

module.exports = { generateImage };

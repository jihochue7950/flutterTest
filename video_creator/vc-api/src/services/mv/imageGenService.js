'use strict';
const path = require('path');
const fs   = require('fs');
const https = require('https');
const http  = require('http');

// fal.ai FLUX Kontext — 다중 캐릭터 시트 + 프롬프트 → 이미지 생성
async function generateImage({ prompt, characterSheetUrls = [], characterSheetUrl, globalStyle, outputPath }) {
  const FAL_KEY = process.env.FAL_KEY || '';
  const MODEL   = process.env.IMAGE_MODEL || 'fal-ai/flux-pro/kontext';

  // 단일 URL도 배열로 통합
  const allUrls = characterSheetUrls.length > 0
    ? characterSheetUrls
    : (characterSheetUrl ? [characterSheetUrl] : []);

  if (!FAL_KEY) {
    console.warn('[ImageGen] FAL_KEY 없음 → Mock 이미지 생성');
    return _mockImage(outputPath, prompt);
  }

  const { fal } = require('@fal-ai/client');
  fal.config({ credentials: FAL_KEY });

  // 모든 캐릭터 시트를 공개 URL로 변환
  const publicUrls = (await Promise.all(allUrls.map(u => _toPublicUrl(u, fal)))).filter(Boolean);

  const fullPrompt = globalStyle ? `${globalStyle}. ${prompt}` : prompt;
  const charCount  = publicUrls.length;
  console.log(`[ImageGen] ${MODEL} 이미지 생성 중... (캐릭터 ${charCount}명 레퍼런스)`);

  // FLUX Kontext: image_url (첫 번째 캐릭터, 나머지는 프롬프트로 설명)
  const input = publicUrls.length > 0
    ? { prompt: fullPrompt, image_url: publicUrls[0] }
    : { prompt: fullPrompt };

  const submitted = await fal.queue.submit(MODEL, { input });
  const requestId = submitted.request_id;

  // 폴링 (최대 5분)
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 10000));
    const status = await fal.queue.status(MODEL, { requestId });
    console.log(`[ImageGen] 상태: ${status.status} (${(i+1)*10}초)`);
    if (status.status === 'COMPLETED') {
      const result = await fal.queue.result(MODEL, { requestId });
      const imgUrl = _parseImageUrl(result);
      if (!imgUrl) throw new Error('이미지 URL을 찾을 수 없습니다.');

      await _downloadFile(imgUrl, outputPath);
      console.log(`[ImageGen] 이미지 저장 완료: ${path.basename(outputPath)}`);
      return { imagePath: outputPath, imageUrl: imgUrl, requestId };
    }
    if (status.status === 'FAILED') throw new Error(`이미지 생성 실패: ${JSON.stringify(status.error)}`);
  }
  throw new Error('이미지 생성 타임아웃');
}

function _parseImageUrl(result) {
  return result?.images?.[0]?.url
      || result?.image?.url
      || result?.output?.image?.url
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

'use strict';
const path  = require('path');
const fs    = require('fs');

// Whisper AI로 음악 파일에서 가사 자동 추출
async function transcribeAudio(audioUrl, audioPath) {
  const FAL_KEY = process.env.FAL_KEY || '';
  if (!FAL_KEY) {
    console.warn('[Whisper] FAL_KEY 없음 → 샘플 가사 반환');
    return _mockLyrics();
  }

  const { fal } = require('@fal-ai/client');
  fal.config({ credentials: FAL_KEY });

  // localhost URL → 로컬 파일을 fal.ai 스토리지에 업로드
  let publicUrl = audioUrl;
  if (!audioUrl || audioUrl.startsWith('http://localhost') || audioUrl.startsWith('http://127.')) {
    const localPath = audioPath || _resolveLocalPath(audioUrl);
    if (!localPath || !fs.existsSync(localPath)) {
      throw new Error(`음악 파일을 찾을 수 없습니다: ${localPath}`);
    }
    console.log('[Whisper] 음악 파일 fal.ai 스토리지 업로드 중...');
    const buffer = fs.readFileSync(localPath);
    const ext    = path.extname(localPath).toLowerCase();
    const mime   = ext === '.wav' ? 'audio/wav' : ext === '.m4a' ? 'audio/mp4' : 'audio/mpeg';
    publicUrl    = await fal.storage.upload(new Blob([buffer], { type: mime }));
    console.log('[Whisper] 업로드 완료:', publicUrl);
  }

  console.log('[Whisper] 가사 추출 시작 (fal-ai/whisper)...');
  try {
    const result = await fal.subscribe('fal-ai/whisper', {
      input: {
        audio_url:   publicUrl,
        task:        'transcribe',
        language:    'ko',
        chunk_level: 'segment',
        version:     '3',
      },
    });

    // 응답 구조 디버그
    console.log('[Whisper] 응답 키:', Object.keys(result || {}));

    // 다양한 응답 구조 처리
    const text =
      result?.text ||
      result?.transcription ||
      result?.output?.text ||
      result?.data?.text ||
      (Array.isArray(result?.chunks) ? result.chunks.map(c => c.text).join(' ') : '') ||
      '';
    const chunks = result?.chunks || result?.output?.chunks || [];
    console.log('[Whisper] 가사 추출 완료, 길이:', text.length, '자');
    return { text, chunks };
  } catch (e) {
    console.error('[Whisper] 오류:', e.message, e.body || '');
    throw new Error(`가사 추출 실패: ${e.message}`);
  }
}

function _resolveLocalPath(url) {
  if (!url) return null;
  const serverBase = process.env.SERVER_BASE_URL || 'http://localhost:5001';
  const uploadBase = process.env.UPLOAD_BASE_PATH || path.join(__dirname, '../../../uploads');
  return path.join(uploadBase, url.replace(serverBase + '/uploads', ''));
}

function _mockLyrics() {
  return {
    text: `[Mock 가사 - FAL_KEY 설정 필요]\n처음 만난 그 날, 너의 미소가\n내 맘을 설레게 했어\n벚꽃이 날리던 그 공원에서\n너와 눈이 마주쳤어\n\n보고 싶다, 자꾸만 생각나\n밤마다 너의 목소리가\n이렇게 내 곁에 있어줘서\n정말 행복해`,
    chunks: [],
  };
}

module.exports = { transcribeAudio };

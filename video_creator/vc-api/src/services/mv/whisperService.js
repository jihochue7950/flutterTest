'use strict';
// Whisper AI로 음악 파일에서 가사 자동 추출

async function transcribeAudio(audioUrl) {
  const FAL_KEY = process.env.FAL_KEY || '';
  if (!FAL_KEY) {
    console.warn('[Whisper] FAL_KEY 없음 → 샘플 가사 반환');
    return _mockLyrics();
  }

  const { fal } = require('@fal-ai/client');
  fal.config({ credentials: FAL_KEY });

  console.log('[Whisper] 가사 추출 시작:', audioUrl);
  try {
    const result = await fal.subscribe('fal-ai/whisper', {
      input: {
        audio_url: audioUrl,
        task: 'transcribe',
        language: 'ko',       // 한국어 우선, 자동 감지도 가능
        chunk_level: 'segment',
        version: 'large-v3',
      },
    });

    // 결과 파싱: 타임스탬프 포함 가사 추출
    const text = result?.text || result?.transcription || '';
    const chunks = result?.chunks || [];

    console.log('[Whisper] 가사 추출 완료, 길이:', text.length);
    return { text, chunks };
  } catch (e) {
    console.error('[Whisper] 오류:', e.message);
    throw new Error(`가사 추출 실패: ${e.message}`);
  }
}

function _mockLyrics() {
  return {
    text: `[Mock 가사 - FAL_KEY 설정 필요]\n처음 만난 그 날, 너의 미소가\n내 맘을 설레게 했어\n벚꽃이 날리던 그 공원에서\n너와 눈이 마주쳤어\n\n보고 싶다, 자꾸만 생각나\n밤마다 너의 목소리가\n이렇게 내 곁에 있어줘서\n정말 행복해`,
    chunks: [],
  };
}

module.exports = { transcribeAudio };

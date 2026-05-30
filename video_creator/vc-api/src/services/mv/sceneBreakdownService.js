'use strict';
// Claude AI로 가사 → 초 단위 장면 분리 + 이미지 프롬프트 생성

async function breakdownLyrics({ lyrics, duration, globalStyle, characterDesc, imagesPerScene = 2 }) {
  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';
  if (!ANTHROPIC_KEY) {
    console.warn('[Breakdown] ANTHROPIC_API_KEY 없음 → Mock 장면 반환');
    return _mockBreakdown(lyrics, duration, imagesPerScene);
  }

  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: ANTHROPIC_KEY });

  const prompt = `You are a professional music video director. Analyze the following song lyrics and create a detailed scene breakdown for a music video.

Song duration: ${duration} seconds
Lyrics:
${lyrics}

Character description: ${characterDesc || 'A cute animated character'}
Visual style: ${globalStyle || '3D animation style, Pixar-inspired, vibrant colors'}
Images per scene: ${imagesPerScene} (each image will become a ${5}-second video clip)

Instructions:
1. Divide the song into ${Math.ceil(duration / (imagesPerScene * 5))} scenes based on the emotional flow of the lyrics
2. Each scene should cover a specific emotional moment (first meeting, longing, joy, etc.)
3. Generate ${imagesPerScene} image prompts per scene - each prompt describes one static illustration
4. Image prompts MUST be in English, very detailed, and include the visual style
5. Make sure the time ranges add up to approximately ${duration} seconds total

Return ONLY valid JSON in this exact format:
{
  "scenes": [
    {
      "scene_order": 1,
      "time_start": 0,
      "time_end": 10,
      "theme": "첫만남",
      "emotion": "설렘",
      "lyrics_segment": "처음 만난 그 날...",
      "images": [
        {
          "image_order": 1,
          "video_duration": 5,
          "prompt": "cute 3D animated girl standing in cherry blossom park, spring morning, surprised and happy expression, first meeting moment, soft bokeh background, warm golden sunlight, Pixar 3D animation style, vibrant colors, cinematic quality"
        }
      ]
    }
  ]
}`;

  console.log('[Breakdown] Claude 장면 분리 요청 중...');
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = msg.content[0]?.text || '';
  // JSON 부분만 추출
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Claude 응답에서 JSON을 찾을 수 없습니다.');

  const parsed = JSON.parse(jsonMatch[0]);
  console.log(`[Breakdown] 장면 ${parsed.scenes?.length}개 생성 완료`);
  return parsed;
}

function _mockBreakdown(lyrics, duration, imagesPerScene) {
  const numScenes = Math.max(3, Math.ceil(duration / (imagesPerScene * 5)));
  const segDuration = duration / numScenes;
  const themes = ['첫만남', '설렘', '그리움', '행복', '사랑 고백', '함께하는 순간'];
  const emotions = ['설렘', '두근거림', '그리움', '행복', '긴장', '따뜻함'];

  return {
    scenes: Array.from({ length: numScenes }, (_, i) => ({
      scene_order: i + 1,
      time_start: Math.round(i * segDuration),
      time_end: Math.round((i + 1) * segDuration),
      theme: themes[i % themes.length],
      emotion: emotions[i % emotions.length],
      lyrics_segment: `[${i + 1}번째 구간 가사]`,
      images: Array.from({ length: imagesPerScene }, (_, j) => ({
        image_order: j + 1,
        video_duration: 5,
        prompt: `cute 3D animated character, scene ${i + 1} image ${j + 1}, ${themes[i % themes.length]} moment, Pixar animation style, vibrant colors, cinematic quality [MOCK - ANTHROPIC_API_KEY 설정 필요]`,
      })),
    })),
  };
}

module.exports = { breakdownLyrics };

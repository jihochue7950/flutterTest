'use strict';

async function breakdownLyrics({ lyrics, duration, globalStyle, characterDesc, imagesPerScene = 2, characterNames = [] }) {
  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';
  if (!ANTHROPIC_KEY) {
    console.warn('[Breakdown] ANTHROPIC_API_KEY 없음 → Mock 장면 반환');
    return _mockBreakdown(lyrics, duration, imagesPerScene);
  }

  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: ANTHROPIC_KEY });

  // 캐릭터 정보 구성
  const charInfo = characterNames.length > 0
    ? characterNames.map((n, i) => `캐릭터${i + 1}: ${n}`).join(', ')
    : (characterDesc || '주인공 캐릭터');

  const numScenes = Math.ceil(duration / (imagesPerScene * 5));

  const systemPrompt = `You are a professional music video director and AI image prompt specialist.
Your job is to create MAXIMALLY DETAILED image prompts that bring song lyrics to life visually.
Each prompt will be used to generate an AI image, so every detail matters.

RULES:
- Every prompt MUST be in English
- Every prompt MUST be at least 60 words
- Prompts must reflect the EXACT emotional story of the specific lyrics
- Character names: ${charInfo}
- When both characters appear together, describe BOTH their positions, actions, and expressions
- Visual style to maintain: ${globalStyle || '3D Pixar animation style, vibrant colors, cinematic quality'}`;

  const userPrompt = `Song lyrics:
${lyrics}

Total duration: ${duration} seconds
Create EXACTLY ${numScenes} scenes. Each scene has ${imagesPerScene} images × 5 seconds = ${imagesPerScene * 5}s per scene.

For EACH image prompt, you MUST include ALL 6 elements:
1. [WHO] Which character(s) appear and their EXACT pose/body position
2. [ACTION] Precisely what they are physically doing (not just standing - be specific)
3. [EXPRESSION] Exact facial expression and emotion visible (tears, smile type, eye direction, etc.)
4. [CAMERA] Specific camera angle (e.g., extreme close-up on eyes, low-angle wide shot, over-shoulder)
5. [LIGHTING] Detailed lighting (e.g., soft golden backlight at sunset, cool moonlight casting shadows)
6. [BACKGROUND] Specific detailed setting that matches the story of the lyrics
End each prompt with: visual style: ${globalStyle || '3D Pixar animation style, vibrant colors, cinematic'}

Make prompts reflect the lyrical story PRECISELY. If lyrics say "I miss you", show longing. If "first meeting", show surprise and shyness.

Return ONLY valid JSON:
{
  "scenes": [
    {
      "scene_order": 1,
      "time_start": 0,
      "time_end": ${imagesPerScene * 5},
      "theme": "장면테마(한국어)",
      "emotion": "감정(한국어)",
      "lyrics_segment": "해당 가사 구절",
      "images": [
        {
          "image_order": 1,
          "video_duration": 5,
          "prompt": "DETAILED 60+ WORD PROMPT HERE with all 6 elements"
        }
      ]
    }
  ]
}`;

  console.log('[Breakdown] Claude Sonnet 장면 분리 요청 중...');
  const msg = await client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 8192,
    system:     systemPrompt,
    messages:   [{ role: 'user', content: userPrompt }],
  });

  const raw = msg.content[0]?.text || '';
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
        prompt: `cute 3D animated character, scene ${i + 1} image ${j + 1}, ${themes[i % themes.length]} moment, close-up showing emotion, soft cinematic lighting, Pixar animation style [MOCK]`,
      })),
    })),
  };
}

module.exports = { breakdownLyrics };

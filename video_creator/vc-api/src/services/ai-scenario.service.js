'use strict';

const Anthropic = require('@anthropic-ai/sdk');

let anthropic = null;
function getClient() {
  if (!anthropic && process.env.ANTHROPIC_API_KEY) {
    anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropic;
}

const EVENT_PERSONAS = {
  proposal:    { name: '프로포즈',         tone: '감동적이고 로맨틱한' },
  birthday:    { name: '생일 이벤트',      tone: '따뜻하고 유쾌한' },
  anniversary: { name: '기념일',           tone: '소중하고 감사한' },
  parents:     { name: '부모님 감사 영상', tone: '따뜻하고 진심 어린' },
  teacher:     { name: '스승의 날',        tone: '존경스럽고 감사한' },
  other:       { name: '감성 이벤트',      tone: '따뜻하고 감동적인' },
};

const STYLE_GUIDE = {
  emotional: '감동적이고 눈물이 날 만한',
  luxury:    '고급스럽고 세련된',
  cinematic: '영화 같은 드라마틱한',
  bright:    '밝고 따뜻한 행복한',
  parents:   '따뜻하고 정겨운 가족적인',
  proposal:  '설레고 로맨틱한',
};

/**
 * Claude API로 감성 시나리오 생성
 * @param {{ event_type, style, user_scenario, photo_count }} params
 * @returns {Promise<string>} 생성된 시나리오 텍스트
 */
async function generateScenario({ event_type, style, user_scenario, photo_count }) {
  const client = getClient();

  // Claude API 없을 때 기본 시나리오 반환
  if (!client) {
    console.warn('[AI] ANTHROPIC_API_KEY 없음 → 기본 시나리오 사용');
    return _defaultScenario(event_type, style);
  }

  const persona = EVENT_PERSONAS[event_type] || EVENT_PERSONAS.other;
  const styleTone = STYLE_GUIDE[style] || STYLE_GUIDE.emotional;

  const prompt = `당신은 감동적인 이벤트 영상 시나리오 작가입니다.

아래 정보를 바탕으로 영상 시나리오를 한국어로 작성해주세요.

이벤트 종류: ${persona.name}
영상 스타일: ${styleTone} 스타일
총 사진 수: ${photo_count}장
${user_scenario ? `의뢰인 메모:\n${user_scenario}` : ''}

다음 형식으로 작성해주세요:
1. 영상 제목 (한 줄)
2. 전체 감정 흐름 (2~3문장)
3. 장면별 구성 (${Math.min(photo_count, 6)}개 장면, 각 장면마다 제목과 감성 설명 1~2문장)
4. 대표 자막 문구 3개

${persona.tone} 분위기로 작성하세요. 진부하지 않고 진심이 담긴 문장으로 작성해주세요.`;

  try {
    const msg = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages:   [{ role: 'user', content: prompt }],
    });
    return msg.content[0]?.text || _defaultScenario(event_type, style);
  } catch (e) {
    console.error('[AI] 시나리오 생성 실패:', e.message);
    return _defaultScenario(event_type, style);
  }
}

function _defaultScenario(event_type, style) {
  const persona = EVENT_PERSONAS[event_type] || EVENT_PERSONAS.other;
  return `[${persona.name} 영상 시나리오]

이 영상은 소중한 사람에게 전하는 특별한 메시지를 담고 있습니다.
함께한 순간들을 돌아보며, 말로 다 할 수 없는 감사와 사랑을 전합니다.

장면 1 - 시작: 처음 만났던 소중한 순간들
장면 2 - 추억: 함께했던 행복한 시간들
장면 3 - 감사: 언제나 곁에 있어줘서 고마웠던 날들
장면 4 - 현재: 지금 이 순간 전하고 싶은 마음
장면 5 - 마무리: 앞으로도 함께하고 싶은 소망

대표 자막: "당신이 있어 행복합니다" / "고마워요, 사랑해요" / "우리의 소중한 순간"`;
}

module.exports = { generateScenario };

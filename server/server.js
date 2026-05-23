/**
 * AI Proposal 프로덕션 서버
 *
 * ★ 식별 키: user_code (문자열)
 *   - user_videos.user_code  → 해당 사용자의 영상 조회
 *   - ai_questions.user_code → 해당 사용자의 커스텀 질문 조회
 *
 * ★ 환경변수:
 *   PORT_API, PORT_INVITE, PUBLIC_HOST, VIDEO_HOST
 *   DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
 *   OPENAI_API_KEY     → OpenAI Realtime API 음성 대화 (우선 사용)
 *   ANTHROPIC_API_KEY  → Claude AI 텍스트 반응 (OPENAI 없을 때 폴백)
 *
 * ★ 우선순위: OPENAI_API_KEY > ANTHROPIC_API_KEY > 기본 반응
 *
 * ★ 실행:
 *   직접: PUBLIC_HOST=3.34.99.69 DB_PASSWORD=yourpw node server.js
 *   PM2 : pm2 start ecosystem.config.js
 */

'use strict';

const http      = require('http');
const https     = require('https');
const crypto    = require('crypto');
const WebSocket = require('ws');
const mysql     = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

// ── 환경변수 ──────────────────────────────────────────────────────────────────
const API_PORT    = parseInt(process.env.PORT_API    || '3000', 10);
const INVITE_PORT = parseInt(process.env.PORT_INVITE || '4000', 10);
const PUBLIC_HOST = process.env.PUBLIC_HOST || 'localhost';
const VIDEO_HOST  = process.env.VIDEO_HOST  || PUBLIC_HOST;
const INVITE_BASE = `http://${PUBLIC_HOST}:${INVITE_PORT}`;

// Solapi SMS
const SOLAPI_API_KEY    = process.env.SOLAPI_API_KEY    || '';
const SOLAPI_API_SECRET = process.env.SOLAPI_API_SECRET || '';
const SOLAPI_FROM       = (process.env.SOLAPI_FROM || '').replace(/[^0-9]/g, '');

// OpenAI Realtime API (우선)
const OPENAI_API_KEY    = process.env.OPENAI_API_KEY    || '';
// Anthropic Claude AI (폴백)
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

const DB_CONFIG = {
  host:               process.env.DB_HOST     || 'localhost',
  port:           parseInt(process.env.DB_PORT || '3306', 10),
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME     || 'ai_proposal',
  waitForConnections: true,
  connectionLimit:    10,
  timezone:           '+09:00',
};

// ── 기본 질문 (ai_questions 테이블에 커스텀 질문이 없을 때 사용) ───────────────
// 질문 객체: { question_text, answer_type: 'open'|'closed', expected_answer }
const DEFAULT_QUESTIONS = [
  { question_text: '오늘 이렇게 만나게 되어 정말 기쁩니다. 요즘 어떻게 지내셨나요?',       answer_type: 'open',   expected_answer: null },
  { question_text: '처음 만났던 날을 기억하시나요? 그 때의 기억이 아직도 생생하신가요?',   answer_type: 'open',   expected_answer: null },
  { question_text: '앞으로 함께 하고 싶은 일이 있다면 어떤 것인가요?',                     answer_type: 'open',   expected_answer: null },
  { question_text: '지금 이 순간 당신에게 가장 소중한 것은 무엇인가요?',                   answer_type: 'open',   expected_answer: null },
];

const TTS_DELAY_PER_CHAR = 80;
const TTS_BASE_DELAY     = 1500;

// ── 인메모리 저장소 ───────────────────────────────────────────────────────────
const sessions  = new Map(); // sessionId → session 객체
const tokenMap  = new Map(); // inviteToken → sessionId
const clientMap = new Map(); // sessionId → Set<WebSocket>

// ── eventType 설정 ─────────────────────────────────────────────────────────────

// productSlug → eventType 매핑
function slugToEventType(slug) {
  if (!slug) return 'proposal';
  if (slug.includes('birthday'))    return 'birthday';
  if (slug.includes('anniversary') || slug.includes('family')) return 'anniversary';
  return 'proposal';
}

// eventType별 AI 페르소나 및 톤
const EVENT_PERSONAS = {
  proposal: {
    persona:  '당신은 감동적인 프로포즈를 연출하는 따뜻한 AI 큐피드입니다.',
    tone:     '따뜻하고 감동적인 분위기로 대화하세요. 상대방의 마음을 열어주는 질문을 이어가세요.',
    closing:  '정말 감사합니다. 소중한 이야기를 나눠주셔서 행복했습니다. 이제 특별히 준비한 영상을 보여드리겠습니다.',
  },
  birthday: {
    persona:  '당신은 특별한 생일을 축하해주는 활기차고 따뜻한 AI 어시스턴트입니다.',
    tone:     '밝고 유쾌하지만 따뜻한 분위기로 대화하세요. 생일 주인공이 기분 좋게 웃을 수 있도록 해주세요.',
    closing:  '오늘 이렇게 함께해서 너무 행복했어요! 생일을 더욱 특별하게 만들어줄 깜짝 선물을 보여드릴게요.',
  },
  anniversary: {
    persona:  '당신은 소중한 기념일을 함께 축하하는 따뜻한 AI 어시스턴트입니다.',
    tone:     '따뜻하고 감사한 분위기로 대화하세요. 함께한 시간의 소중함을 느낄 수 있도록 해주세요.',
    closing:  '함께한 시간들이 얼마나 소중한지 다시 한번 느낄 수 있었습니다. 특별한 영상을 보여드리겠습니다.',
  },
};

// ── OpenAI Realtime API ───────────────────────────────────────────────────────

function buildRealtimeSystemPrompt(questions, eventType = 'proposal') {
  const persona = EVENT_PERSONAS[eventType] || EVENT_PERSONAS.proposal;
  const qList = questions.map((q, i) => {
    const aType    = q.answer_type     || 'open';
    const expected = aType === 'closed' && q.expected_answer
      ? ` (정답 키워드: ${q.expected_answer})` : '';
    return `${i + 1}. [${aType}] ${q.question_text}${expected}`;
  }).join('\n');

  return `${persona.persona} 반드시 한국어로만 대화합니다.
${persona.tone}

아래 질문들을 순서대로 진행하세요:
${qList}

규칙:
- 각 질문에 답변을 듣고 1~2문장으로 따뜻하게 반응한 뒤 다음 질문으로 자연스럽게 넘어가세요
- [closed] 타입: 정답 키워드와 의미가 비슷하면 긍정 반응, 아니면 부드럽게 재도전 유도 (1회)
- [open] 타입: 어떤 답이든 감동적으로 반응하고 다음으로 진행
- 모든 질문이 끝나면 마무리 한마디 후 반드시 proposal_complete 함수를 호출하세요`;
}

/**
 * User B 세션에 OpenAI Realtime API WebSocket 연결을 생성합니다.
 * 연결되면 AI가 첫 번째 질문부터 자동으로 대화를 시작합니다.
 * @returns {boolean} 연결 시작 성공 여부
 */
async function startRealtimeSession(sessionId, session) {
  if (!OPENAI_API_KEY) return false;

  const questions    = session.questions || DEFAULT_QUESTIONS;
  const systemPrompt = buildRealtimeSystemPrompt(questions, session.eventType || 'proposal');

  try {
    const rtWs = new WebSocket(
      'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17',
      { headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'OpenAI-Beta': 'realtime=v1' } }
    );

    session.realtimeWs  = rtWs;
    session.micActive   = false;
    session.rtTextBuf   = '';

    rtWs.on('open', () => {
      log('🤖', `[RT] OpenAI Realtime 연결 [${sessionId.substring(0, 8)}...]`);

      rtWs.send(JSON.stringify({
        type: 'session.update',
        session: {
          modalities:   ['text'],
          instructions: systemPrompt,
          input_audio_format: 'pcm16',
          input_audio_transcription: { model: 'whisper-1' },
          // 수동 턴 감지: User B가 버튼 뗄 때 commit 신호 전송
          turn_detection: null,
          tools: [{
            type: 'function', name: 'proposal_complete',
            description: '모든 질문 완료 후 프로포즈 영상을 재생할 준비가 됐을 때 호출',
            parameters: { type: 'object', properties: {}, required: [] },
          }],
          tool_choice: 'auto',
        },
      }));

      // 500ms 후 AI가 첫 질문 시작
      setTimeout(() => {
        if (rtWs.readyState === WebSocket.OPEN) {
          rtWs.send(JSON.stringify({ type: 'response.create' }));
        }
      }, 500);
    });

    rtWs.on('message', (raw) => {
      try { handleRealtimeEvent(sessionId, session, rtWs, JSON.parse(raw.toString())); }
      catch (_) {}
    });

    rtWs.on('error', (err) => log('❌', `[RT] 오류: ${err.message}`));
    rtWs.on('close', () => {
      log('🔌', `[RT] 연결 종료 [${sessionId.substring(0, 8)}...]`);
      session.realtimeWs = null;
    });

    return true;
  } catch (err) {
    log('❌', `[RT] 시작 실패: ${err.message}`);
    return false;
  }
}

function handleRealtimeEvent(sessionId, session, rtWs, event) {
  switch (event.type) {

    // AI 텍스트 조각 수신 → 버퍼에 누적
    case 'response.text.delta':
      session.rtTextBuf = (session.rtTextBuf || '') + (event.delta || '');
      break;

    // AI 텍스트 완성 → TV로 aiSpeech 전송 (flutter_tts가 재생)
    case 'response.text.done': {
      const text = (event.text || '').trim();
      if (text) {
        log('🤖', `[RT] AI: "${text}"`);
        broadcast(sessionId, makeEvent('aiSpeech', sessionId, { text }));
        // 마이크는 TV TTS 완료 후 TV가 aiListening을 전송할 때 활성화
      }
      session.rtTextBuf = '';
      break;
    }

    // AI가 proposal_complete 함수 호출 → 영상 재생
    case 'response.function_call_arguments.done':
      if (event.name === 'proposal_complete') {
        log('🎉', '[RT] proposal_complete → 영상 재생');
        rtHandleProposalComplete(sessionId, session, rtWs);
      }
      break;

    // User B 음성 인식 완료 → 로그 + 화면에 표시
    case 'conversation.item.input_audio_transcription.completed': {
      const transcript = (event.transcript || '').trim();
      if (transcript) {
        log('💬', `[RT] User B: "${transcript}"`);
        broadcast(sessionId, makeEvent('userBSpeech', sessionId, { text: transcript }));
      }
      break;
    }

    case 'input_audio_buffer.speech_started':
      log('🎙️', '[RT] 말하기 시작');
      break;

    case 'error':
      log('❌', `[RT] API 오류: ${JSON.stringify(event.error)}`);
      break;
  }
}

async function rtHandleProposalComplete(sessionId, session, rtWs) {
  const videoUrl = await getUserVideoUrl(session.userCode) || null;
  log('🎬', `[RT] 영상: ${videoUrl}`);
  broadcast(sessionId, makeEvent('videoPlayRequested', sessionId, {
    videoUrl, userCode: session.userCode,
  }));
  console.log('\n' + '='.repeat(58));
  console.log(`🎉 프로포즈 완료! userCode: ${session.userCode}`);
  console.log('='.repeat(58) + '\n');
  if (rtWs && rtWs.readyState === WebSocket.OPEN) rtWs.close();
}

// ── Claude AI (폴백) ──────────────────────────────────────────────────────────
let anthropic = null;

function initAi() {
  if (!ANTHROPIC_API_KEY) {
    log('⚠️', 'ANTHROPIC_API_KEY 없음 → AI 반응 기본값 사용');
    return;
  }
  try {
    const { Anthropic } = require('@anthropic-ai/sdk');
    anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
    log('🤖', 'Claude AI 초기화 완료');
  } catch (e) {
    log('⚠️', `Claude AI 초기화 실패: ${e.message}`);
  }
}

/**
 * AI가 사용자 답변에 자연스럽게 반응하고 다음 질문으로 이동 여부를 결정합니다.
 * answer_type='open'  → 항상 다음으로 진행
 * answer_type='closed' → 정답과 비교 후 결정 (1회 오답 시 재시도, 2회차 무조건 진행)
 *
 * @returns {Promise<{response: string, moveToNext: boolean}>}
 */
async function generateAiReaction(question, answer, conversationHistory) {
  const qText    = question.question_text;
  const aType    = question.answer_type    || 'open';
  const expected = question.expected_answer || null;

  if (!anthropic) {
    // API 키 없을 때 기본 반응
    const defaults = {
      open:   '정말 소중한 이야기네요! 감사합니다.',
      closed: aType === 'closed' ? '오! 기억하는군요, 정말 대단해요!' : '감사합니다.',
    };
    return { response: defaults[aType] || defaults.open, moveToNext: true };
  }

  const systemPrompt = `당신은 특별한 프로포즈 경험을 연출하는 따뜻한 AI 어시스턴트입니다.
반드시 아래 JSON 형식으로만 응답하세요: {"response":"한국어 반응","moveToNext":true}

[현재 질문] ${qText}
[답변 유형] ${aType}${expected ? `\n[정답 키워드] ${expected}` : ''}

규칙:
- response: 1~2문장, 따뜻하고 감동적인 한국어, 과하지 않게
- answer_type이 'open' → 어떤 답이든 moveToNext: true
- answer_type이 'closed' → 답변이 정답 키워드와 의미상 일치하면 true, 아니면 false (재도전 유도)
- 오답 반응: 차갑지 않게, 예) "음... 다시 한번 생각해볼까요? 힌트를 드리자면..."
- JSON 외 다른 텍스트 절대 출력 금지`;

  const messages = [
    ...conversationHistory.slice(-6),
    { role: 'user', content: `사용자 답변: "${answer}"` },
  ];

  try {
    const resp = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system:     systemPrompt,
      messages,
    });
    const raw       = resp.content[0].text.trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        response:   String(parsed.response || '감사합니다.'),
        moveToNext: Boolean(parsed.moveToNext),
      };
    }
    return { response: raw.slice(0, 120), moveToNext: true };
  } catch (err) {
    log('❌', `Claude AI 오류: ${err.message}`);
    return { response: '감사합니다! 다음 이야기로 넘어가 볼게요.', moveToNext: true };
  }
}

// ── MariaDB ───────────────────────────────────────────────────────────────────
let pool = null;

async function initDb() {
  try {
    pool = mysql.createPool(DB_CONFIG);
    await pool.query('SELECT 1');
    log('🗄️', `MariaDB 연결 성공 (${DB_CONFIG.host}/${DB_CONFIG.database})`);
  } catch (err) {
    log('⚠️', `MariaDB 연결 실패 → 기본값 사용: ${err.message}`);
    pool = null;
  }
}

/**
 * user_code로 해당 사용자의 커스텀 질문 목록을 조회합니다.
 * ai_questions 테이블에서 sort_order ASC 순으로 반환합니다.
 * 커스텀 질문이 없으면 DEFAULT_QUESTIONS를 반환합니다.
 *
 * @param {string} userCode - ai_questions.user_code
 * @returns {Promise<string[]>} 질문 텍스트 배열
 */
async function getUserQuestions(userCode) {
  if (!pool || !userCode) return [...DEFAULT_QUESTIONS];

  try {
    const [rows] = await pool.query(
      `SELECT question_text, answer_type, expected_answer
       FROM   ai_questions
       WHERE  user_code = ? AND is_active = 1
       ORDER BY sort_order ASC, id ASC`,
      [userCode]
    );

    if (!rows.length) {
      log('⚠️', `user_code=${userCode} 커스텀 질문 없음 → 기본 질문 사용`);
      return [...DEFAULT_QUESTIONS];
    }

    const questions = rows.map(r => ({
      question_text:   r.question_text,
      answer_type:     r.answer_type     || 'open',
      expected_answer: r.expected_answer || null,
    }));
    log('💬', `user_code=${userCode} 커스텀 질문 ${questions.length}개 로드`);
    return questions;
  } catch (err) {
    log('❌', `질문 조회 오류 (user_code=${userCode}): ${err.message}`);
    return [...DEFAULT_QUESTIONS];
  }
}

/**
 * user_code로 해당 사용자의 영상 URL을 조회합니다.
 * is_active DESC → created_at DESC 순으로 우선순위를 정합니다.
 *
 * @param {string} userCode - user_videos.user_code
 * @returns {Promise<string|null>} 영상 URL 또는 null
 */
async function getUserVideoUrl(userCode) {
  if (!pool || !userCode) return null;

  try {
    const [rows] = await pool.query(
      `SELECT video_url, stored_filename
       FROM   user_videos
       WHERE  user_code = ?
       ORDER BY is_active DESC, created_at DESC
       LIMIT 1`,
      [userCode]
    );

    if (!rows.length) {
      log('⚠️', `user_code=${userCode} 영상 없음`);
      return null;
    }

    // video_url의 'your-ec2-ip' 플레이스홀더를 실제 IP로 교체
    const url = (rows[0].video_url || '')
      .replace(/your-ec2-ip/gi, VIDEO_HOST);

    log('🎬', `영상 조회: user_code=${userCode}, file=${rows[0].stored_filename}`);
    return url || null;
  } catch (err) {
    log('❌', `영상 조회 오류 (user_code=${userCode}): ${err.message}`);
    return null;
  }
}


// ── Solapi SMS 발송 ───────────────────────────────────────────────────────────

function sendSolapiSms({ to, text }) {
  if (!SOLAPI_API_KEY || !SOLAPI_API_SECRET || !SOLAPI_FROM) {
    log('📵', 'Solapi 환경변수 없음 → SMS 건너뜀');
    return Promise.resolve();
  }
  const date      = new Date().toISOString();
  const salt      = crypto.randomBytes(16).toString('hex');
  const signature = crypto.createHmac('sha256', SOLAPI_API_SECRET).update(date + salt).digest('hex');
  const cleanTo   = to.replace(/[^0-9]/g, '');
  const body      = JSON.stringify({ message: { to: cleanTo, from: SOLAPI_FROM, text } });

  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: 'api.solapi.com',
        path:     '/messages/v4/send',
        method:   'POST',
        headers: {
          'Content-Type':   'application/json',
          'Content-Length': Buffer.byteLength(body),
          'Authorization':  `HMAC-SHA256 apiKey=${SOLAPI_API_KEY}, date=${date}, salt=${salt}, signature=${signature}`,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => { data += c; });
        res.on('end', () => {
          if (res.statusCode === 200 || res.statusCode === 201) {
            log('📱', `SMS 발송 성공 → ${cleanTo.slice(0,3)}****${cleanTo.slice(-4)}`);
          } else {
            log('❌', `SMS 발송 실패 [${res.statusCode}]: ${data}`);
          }
          resolve();
        });
      }
    );
    req.on('error', (err) => { log('❌', `SMS 오류: ${err.message}`); resolve(); });
    req.write(body);
    req.end();
  });
}

// ── 유틸 ──────────────────────────────────────────────────────────────────────

function ttsDelay(text) {
  return TTS_BASE_DELAY + (text.length * TTS_DELAY_PER_CHAR);
}

function broadcast(sessionId, message) {
  const clients = clientMap.get(sessionId);
  if (!clients) return;
  const data = JSON.stringify(message);
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) ws.send(data);
  }
}

function makeEvent(type, sessionId, data = {}) {
  return { type, sessionId, data, timestamp: new Date().toISOString() };
}

function log(emoji, msg) {
  console.log(`[${new Date().toLocaleTimeString('ko-KR')}] ${emoji}  ${msg}`);
}

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// ── WebSocket ─────────────────────────────────────────────────────────────────
const wss = new WebSocket.Server({ noServer: true });

wss.on('connection', (ws, sessionId) => {
  if (!clientMap.has(sessionId)) clientMap.set(sessionId, new Set());
  clientMap.get(sessionId).add(ws);
  log('🔌', `WS 연결 [${sessionId.substring(0, 8)}...]`);

  ws.on('message', raw => {
    try { handleWsEvent(sessionId, JSON.parse(raw.toString())); }
    catch (_) {}
  });
  ws.on('close', () => {
    clientMap.get(sessionId)?.delete(ws);
    log('🔌', `WS 종료 [${sessionId.substring(0, 8)}...]`);
  });
  ws.on('error', err => log('❌', `WS 오류: ${err.message}`));
});

// ── WS 이벤트 처리 ────────────────────────────────────────────────────────────
function handleWsEvent(sessionId, event) {
  const session = sessions.get(sessionId);
  if (!session) return;

  switch (event.type) {

    case 'userBJoined':
      handleUserBJoined(sessionId, session);
      break;

    // TV TTS 완료 신호 → 마이크 활성화 후 전체 브로드캐스트
    case 'aiListening':
      if (session.realtimeWs && session.realtimeWs.readyState === WebSocket.OPEN) {
        session.micActive = true;
      }
      broadcast(sessionId, makeEvent('aiListening', sessionId));
      break;

    // User B 음성 청크 → OpenAI Realtime으로 릴레이
    case 'audioChunk':
      if (session.realtimeWs
          && session.realtimeWs.readyState === WebSocket.OPEN
          && session.micActive
          && event.data) {
        session.realtimeWs.send(JSON.stringify({
          type:  'input_audio_buffer.append',
          audio: event.data, // base64 PCM16 24kHz mono
        }));
      }
      break;

    // User B 버튼 뗌 → 오디오 버퍼 커밋 + AI 응답 요청
    case 'audioCommit':
      if (session.realtimeWs && session.realtimeWs.readyState === WebSocket.OPEN) {
        session.micActive = false;
        session.realtimeWs.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
        session.realtimeWs.send(JSON.stringify({ type: 'response.create' }));
        log('🎙️', '[RT] 오디오 커밋 → AI 응답 요청');
      }
      break;

    // 텍스트 폴백 (마이크 없는 환경 or Realtime API 미사용 시)
    case 'userBSpeech':
      if (session.realtimeWs && session.realtimeWs.readyState === WebSocket.OPEN) {
        // Realtime API 사용 중: 텍스트를 conversation item으로 주입
        session.realtimeWs.send(JSON.stringify({
          type: 'conversation.item.create',
          item: {
            type: 'message', role: 'user',
            content: [{ type: 'input_text', text: event.data?.text || '' }],
          },
        }));
        session.realtimeWs.send(JSON.stringify({ type: 'response.create' }));
      } else {
        // Realtime API 없음: 기존 텍스트 기반 흐름
        handleUserBSpeech(sessionId, session, event.data?.text);
      }
      break;
  }
}

/**
 * User B 접속 처리
 * 1. DB에서 userCode의 커스텀 질문 로드
 * 2. 세션에 저장
 * 3. 1초 후 첫 질문 전송
 */
async function handleUserBJoined(sessionId, session) {
  if (session.userBJoined) return;
  session.userBJoined = true;
  session.conversationHistory = [];
  session.retryCount = 0;

  log('👋', `User B 접속! [userCode: ${session.userCode}]`);
  broadcast(sessionId, makeEvent('userBJoined', sessionId));

  // DB에서 커스텀 질문 로드 (없으면 DEFAULT_QUESTIONS 사용)
  const questions = await getUserQuestions(session.userCode);
  session.questions = questions;

  log('📋', `질문 ${questions.length}개 준비 완료`);

  // OpenAI Realtime API 사용 시: AI가 직접 대화를 시작
  if (OPENAI_API_KEY) {
    const started = await startRealtimeSession(sessionId, session);
    if (started) {
      log('🤖', '[RT] Realtime API로 대화 시작');
      return; // Realtime이 첫 질문을 전송함
    }
  }

  // 폴백: 기존 텍스트 기반 흐름 (Claude or 기본 반응)
  setTimeout(() => {
    const q    = session.questions[0];
    const qText = q.question_text;
    session.currentQuestion = 0;
    log('🤖', `질문 1/${session.questions.length}: "${qText}"`);
    broadcast(sessionId, makeEvent('aiSpeech', sessionId, { text: qText }));

    setTimeout(() => {
      broadcast(sessionId, makeEvent('aiListening', sessionId));
    }, ttsDelay(qText));
  }, 1000);
}

/**
 * User B 답변 처리
 * 1. 답변 저장
 * 2. 질문이 남았으면 다음 질문 전송
 * 3. 모든 질문 완료 시 DB에서 영상 URL 조회 → videoPlayRequested 전송
 */
async function handleUserBSpeech(sessionId, session, text) {
  if (!text || text.trim() === '') return;

  const trimmed    = text.trim();
  const questions  = session.questions || DEFAULT_QUESTIONS;
  const currentIdx = session.currentQuestion;
  const currentQ   = questions[currentIdx];
  const total      = questions.length;

  session.conversationHistory = session.conversationHistory || [];
  session.retryCount = session.retryCount !== undefined ? session.retryCount : 0;

  log('💬', `답변 [${currentIdx + 1}/${total}] (retry:${session.retryCount}): "${trimmed}"`);

  // Claude AI로 자연스러운 반응 생성
  const { response: aiReaction, moveToNext } = await generateAiReaction(
    currentQ, trimmed, session.conversationHistory
  );

  // 대화 이력 갱신
  session.conversationHistory.push(
    { role: 'user',      content: trimmed    },
    { role: 'assistant', content: aiReaction },
  );

  // closed 질문: 재시도 1회 소진 시 무조건 진행
  const shouldAdvance = moveToNext || session.retryCount >= 1;

  setTimeout(async () => {
    broadcast(sessionId, makeEvent('aiSpeech', sessionId, { text: aiReaction }));

    if (shouldAdvance) {
      session.answers = session.answers || [];
      session.answers.push(trimmed);
      session.retryCount = 0;

      const nextIdx = session.answers.length;

      if (nextIdx < total) {
        // 다음 질문: AI 반응 TTS 완료 후 전송
        setTimeout(() => {
          const nextQ    = questions[nextIdx];
          const nextText = nextQ.question_text;
          session.currentQuestion = nextIdx;
          log('🤖', `질문 ${nextIdx + 1}/${total}: "${nextText}"`);
          broadcast(sessionId, makeEvent('aiSpeech', sessionId, { text: nextText }));
          setTimeout(() => {
            broadcast(sessionId, makeEvent('aiListening', sessionId));
          }, ttsDelay(nextText));
        }, ttsDelay(aiReaction));

      } else {
        // 모든 질문 완료 → eventType별 마무리 멘트 + 영상
        const eventPersona = EVENT_PERSONAS[session.eventType] || EVENT_PERSONAS.proposal;
        const closing = eventPersona.closing;

        setTimeout(async () => {
          log('🎤', '마무리 멘트 전송');
          broadcast(sessionId, makeEvent('aiSpeech', sessionId, { text: closing }));

          const videoUrl = await getUserVideoUrl(session.userCode) || null;
          log('🎬', `영상 URL: ${videoUrl}`);

          setTimeout(() => {
            broadcast(sessionId, makeEvent('videoPlayRequested', sessionId, {
              videoUrl,
              userCode: session.userCode,
            }));
            console.log('\n' + '='.repeat(58));
            console.log(`🎉 프로포즈 완료! userCode: ${session.userCode}`);
            console.log(`   영상: ${videoUrl}`);
            console.log('='.repeat(58) + '\n');
          }, ttsDelay(closing));
        }, ttsDelay(aiReaction));
      }

    } else {
      // 오답 → 재시도 카운트 증가, TTS 후 입력 재활성화
      session.retryCount++;
      setTimeout(() => {
        broadcast(sessionId, makeEvent('aiListening', sessionId));
      }, ttsDelay(aiReaction));
    }
  }, 800);
}

// ── HTTP API 서버 ─────────────────────────────────────────────────────────────
const apiServer = http.createServer((req, res) => {
  setCorsHeaders(res);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url  = new URL(req.url, `http://localhost:${API_PORT}`);
  const path = url.pathname;

  const readBody = () => new Promise(resolve => {
    let b = '';
    req.on('data', c => b += c);
    req.on('end', () => { try { resolve(JSON.parse(b || '{}')); } catch { resolve({}); } });
  });

  (async () => {
    try {

      // POST /sessions ─────────────────────────────────────────────────────────
      if (req.method === 'POST' && path === '/sessions') {
        const data = await readBody();

        // userCode: Flutter 앱에서 세션 생성 시 전달
        const userCode   = data.userCode || data.user_code || null;
        // productSlug → eventType 변환 (없으면 proposal 기본값)
        const eventType  = data.eventType || slugToEventType(data.productSlug);

        const session = {
          id:              uuidv4(),
          status:          'created',
          title:           data.title  || 'AI 이벤트',
          userCode,
          eventType,                         // ← proposal / birthday / anniversary
          productSlug:     data.productSlug || null,
          videoId:         data.videoId || null,
          userBPhone:      null,
          inviteToken:     null,
          tvConnected:     false,
          userBJoined:     false,
          currentQuestion: -1,
          questions:       null,
          answers:         [],
          createdAt:       new Date().toISOString(),
        };
        sessions.set(session.id, session);
        log('📋', `세션 생성 [${session.id.substring(0, 8)}...] userCode: ${userCode} eventType: ${eventType}`);
        res.writeHead(200); res.end(JSON.stringify(session));
        return;
      }

      // PATCH /sessions/:id ────────────────────────────────────────────────────
      if (req.method === 'PATCH' && /^\/sessions\/[^/]+$/.test(path)) {
        const sId = path.split('/')[2];
        const data = await readBody();
        const s = sessions.get(sId);
        if (!s) { res.writeHead(404); res.end('{}'); return; }
        Object.assign(s, data);
        res.writeHead(200); res.end(JSON.stringify(s));
        return;
      }

      // POST /sessions/:id/invite ──────────────────────────────────────────────
      if (req.method === 'POST' && /^\/sessions\/[^/]+\/invite$/.test(path)) {
        const sId = path.split('/')[2];
        await readBody();
        const s = sessions.get(sId);
        if (!s) { res.writeHead(404); res.end('{}'); return; }

        const token      = uuidv4();
        s.inviteToken    = token;
        s.status         = 'inviteSent';
        tokenMap.set(token, sId);

        const inviteUrl = `${INVITE_BASE}/invite/${token}`;

        // SMS 발송 (백그라운드 — 실패해도 응답에 영향 없음)
        if (s.userBPhone) {
          const title = s.title ? `[${s.title}] ` : '';
          const smsText = `💍 ${title}특별한 초대장이 도착했어요!\n\n지금 바로 확인하세요 👇\n${inviteUrl}`;
          sendSolapiSms({ to: s.userBPhone, text: smsText }).catch(err => log('❌', `SMS 백그라운드 오류: ${err.message}`));
        }

        console.log('\n' + '═'.repeat(58));
        console.log(`📱 초대 링크 [userCode: ${s.userCode}]:`);
        console.log(`   ${inviteUrl}`);
        console.log('═'.repeat(58) + '\n');

        res.writeHead(200); res.end(JSON.stringify({ token, inviteUrl }));
        return;
      }

      // GET /sessions/invite/:token ────────────────────────────────────────────
      if (req.method === 'GET' && /^\/sessions\/invite\/[^/]+$/.test(path)) {
        const token = path.split('/')[3];
        const sId   = tokenMap.get(token);
        if (!sId) { res.writeHead(404); res.end('{}'); return; }
        res.writeHead(200); res.end(JSON.stringify({ sessionId: sId }));
        return;
      }

      // POST /sessions/:id/join ────────────────────────────────────────────────
      if (req.method === 'POST' && /^\/sessions\/[^/]+\/join$/.test(path)) {
        res.writeHead(200); res.end('{}');
        return;
      }

      // GET /users/:userCode/preview ── 사전 확인용 (영상 + 질문 미리보기) ──────
      if (req.method === 'GET' && /^\/users\/[^/]+\/preview$/.test(path)) {
        const userCode = decodeURIComponent(path.split('/')[2]);
        const [videoUrl, questions] = await Promise.all([
          getUserVideoUrl(userCode),
          getUserQuestions(userCode),
        ]);
        res.writeHead(200);
        res.end(JSON.stringify({ userCode, videoUrl, questions }));
        return;
      }

      // GET /health ────────────────────────────────────────────────────────────
      if (req.method === 'GET' && path === '/health') {
        res.writeHead(200);
        res.end(JSON.stringify({
          status: 'ok',
          db: pool ? 'connected' : 'disconnected',
          sessions: sessions.size,
          uptime: Math.floor(process.uptime()),
          adminServerUrl: process.env.ADMIN_SERVER_URL || null,
        }));
        return;
      }

      res.writeHead(404); res.end('{}');

    } catch (err) {
      log('❌', `API 오류: ${err.message}`);
      res.writeHead(500); res.end(JSON.stringify({ error: err.message }));
    }
  })();
});

// WebSocket upgrade
apiServer.on('upgrade', (req, socket, head) => {
  const url   = new URL(req.url, `ws://localhost:${API_PORT}`);
  const match = url.pathname.match(/^\/sessions\/([^/]+)\/ws$/);
  if (!match) { socket.destroy(); return; }
  wss.handleUpgrade(req, socket, head, ws => {
    wss.emit('connection', ws, match[1]);
  });
});

// ── 초대 페이지 서버 ──────────────────────────────────────────────────────────
const invitePageServer = http.createServer((req, res) => {
  setCorsHeaders(res);
  const match = new URL(req.url, `http://localhost:${INVITE_PORT}`)
                    .pathname.match(/^\/invite\/(.+)$/);
  if (!match) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('/invite/{token} 형식으로 접속하세요');
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(buildInviteHtml(
    match[1],
    `http://${PUBLIC_HOST}:${API_PORT}`,
    `ws://${PUBLIC_HOST}:${API_PORT}`
  ));
});

invitePageServer.listen(INVITE_PORT, '0.0.0.0', () => {
  log('🌐', `초대 페이지: http://${PUBLIC_HOST}:${INVITE_PORT}/invite/{token}`);
});

// ── 서버 시작 ─────────────────────────────────────────────────────────────────
(async () => {
  if (OPENAI_API_KEY) {
    log('✅', 'OPENAI_API_KEY 확인 → Realtime API 음성 대화 모드');
  } else {
    log('⚠️', 'OPENAI_API_KEY 없음 → Claude 또는 기본 반응 폴백');
    initAi();
  }
  await initDb();
  apiServer.listen(API_PORT, '0.0.0.0', () => {
    log('🚀', `API + WS: http://${PUBLIC_HOST}:${API_PORT}`);
    console.log('\n서버 준비 완료! Flutter 앱에서 세션을 생성하세요.\n');
  });
})();

process.on('SIGTERM', async () => { if (pool) await pool.end(); process.exit(0); });
process.on('SIGINT',  async () => { if (pool) await pool.end(); process.exit(0); });
process.on('uncaughtException', err => {
  log('💥', `처리되지 않은 예외: ${err.message}\n${err.stack}`);
});

// ── User B 초대 HTML ──────────────────────────────────────────────────────────
function buildInviteHtml(token, apiBase, wsBase) {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>특별한 초대 💍</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
    html,body{height:100%;overflow:hidden}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
         background:linear-gradient(160deg,#0f0c29,#302b63,#24243e);
         display:flex;flex-direction:column;align-items:center;justify-content:space-between;
         min-height:100vh;color:#fff;padding:0 20px 40px}

    /* ── 상단 상태바 ── */
    .topbar{width:100%;display:flex;align-items:center;justify-content:center;
            padding:18px 0 10px;gap:8px}
    .dot-live{width:8px;height:8px;border-radius:50%;background:#f59e0b;
              transition:background .4s}
    .dot-live.on{background:#4ade80;animation:blink 2s infinite}
    @keyframes blink{0%,100%{opacity:1}50%{opacity:.4}}
    .status-text{font-size:13px;opacity:.75;letter-spacing:.5px}

    /* ── AI 말풍선 ── */
    .ai-bubble{width:100%;max-width:440px;margin:8px auto;padding:18px 22px;
               background:rgba(255,255,255,.1);backdrop-filter:blur(12px);
               border:1px solid rgba(255,255,255,.18);border-radius:20px;
               font-size:16px;line-height:1.6;text-align:center;min-height:64px;
               transition:opacity .4s;opacity:0}
    .ai-bubble.show{opacity:1}
    .ai-bubble.typing::after{content:'...';animation:dots 1.2s infinite}
    @keyframes dots{0%{content:'•'}33%{content:'••'}66%{content:'•••'}100%{content:'•'}}

    /* ── 내 발화 말풍선 ── */
    .my-bubble{width:100%;max-width:440px;margin:6px auto;padding:12px 20px;
               background:rgba(233,30,140,.25);border:1px solid rgba(233,30,140,.4);
               border-radius:20px;font-size:15px;line-height:1.5;text-align:center;
               animation:fadeup .3s ease;display:none}
    @keyframes fadeup{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}

    /* ── 중앙 마이크 버튼 영역 ── */
    .mic-area{display:flex;flex-direction:column;align-items:center;gap:18px;flex:1;
              justify-content:center;width:100%}

    .mic-hint{font-size:14px;opacity:.6;letter-spacing:.3px;transition:opacity .3s}
    .mic-hint.active{opacity:1;color:#f472b6}

    /* 마이크 버튼 */
    .mic-btn{width:140px;height:140px;border-radius:50%;border:none;cursor:pointer;
             background:linear-gradient(145deg,#6C63FF,#E91E8C);
             display:flex;align-items:center;justify-content:center;
             box-shadow:0 0 0 0 rgba(233,30,140,0);
             transition:transform .15s,box-shadow .15s;
             touch-action:none;user-select:none;-webkit-user-select:none;position:relative}
    .mic-btn:disabled{background:linear-gradient(145deg,#444,#555);cursor:not-allowed;opacity:.5}
    .mic-btn.recording{transform:scale(1.08);
                       box-shadow:0 0 0 20px rgba(233,30,140,.2),0 0 0 40px rgba(233,30,140,.08)}
    .mic-btn.recording::after{content:'';position:absolute;inset:-10px;border-radius:50%;
                              border:2px solid rgba(233,30,140,.5);
                              animation:ripple 1s infinite}
    @keyframes ripple{0%{transform:scale(1);opacity:.8}100%{transform:scale(1.4);opacity:0}}
    .mic-icon{font-size:56px;pointer-events:none}

    /* ── 텍스트 폴백 (하단, 작게) ── */
    .text-fallback{width:100%;max-width:440px;display:flex;gap:8px;margin-top:8px}
    .text-fallback input{flex:1;padding:10px 16px;border:1px solid rgba(255,255,255,.2);
                          border-radius:24px;background:rgba(255,255,255,.08);color:#fff;
                          font-size:14px;outline:none}
    .text-fallback input::placeholder{color:rgba(255,255,255,.4)}
    .text-fallback input:disabled{opacity:.4}
    .text-fallback button{padding:10px 16px;border:none;border-radius:24px;
                           background:rgba(255,255,255,.15);color:#fff;
                           font-size:13px;cursor:pointer}
    .text-fallback button:disabled{opacity:.3;cursor:not-allowed}

    /* ── 프로포즈 화면 ── */
    #proposal{display:none;position:fixed;inset:0;
              background:linear-gradient(180deg,#1A0030,#3D0060);
              flex-direction:column;align-items:center;justify-content:center;
              text-align:center;padding:40px 32px}
    #proposal.show{display:flex;animation:fadeIn .8s ease}
    @keyframes fadeIn{from{opacity:0}to{opacity:1}}
    .heart{font-size:80px;animation:hb .9s infinite alternate;margin-bottom:28px}
    @keyframes hb{from{transform:scale(1)}to{transform:scale(1.15)}}
    #pmsg{font-size:18px;font-weight:300;line-height:1.8;margin-bottom:28px;max-width:400px}
    .tv-hint{padding:10px 24px;background:rgba(255,255,255,.1);
             border:1px solid rgba(255,255,255,.2);border-radius:30px;font-size:14px}
  </style>
</head>
<body>

  <!-- 상태바 -->
  <div class="topbar">
    <div class="dot-live" id="dot"></div>
    <span class="status-text" id="st">연결 중...</span>
  </div>

  <!-- AI 말풍선 -->
  <div class="ai-bubble" id="aiBubble">잠시 후 AI가 대화를 시작합니다...</div>

  <!-- 내 발화 표시 -->
  <div class="my-bubble" id="myBubble"></div>

  <!-- 마이크 버튼 중앙 -->
  <div class="mic-area">
    <p class="mic-hint" id="micHint">AI가 준비 중입니다...</p>
    <button class="mic-btn" id="micBtn" disabled>
      <span class="mic-icon">🎙️</span>
    </button>
    <p class="mic-hint" id="micSub" style="font-size:12px;margin-top:-8px">
      누르고 말하기 · 손 떼면 전송
    </p>
  </div>

  <!-- 텍스트 폴백 -->
  <div class="text-fallback">
    <input id="inp" type="text" placeholder="텍스트로 답변하기..." disabled/>
    <button id="sendBtn" disabled>전송</button>
  </div>

  <!-- 프로포즈 화면 -->
  <div id="proposal">
    <div class="heart">💕</div>
    <p id="pmsg"></p>
    <div class="tv-hint">📺 TV 화면을 봐주세요</div>
  </div>

<script>
const TOKEN='${token}', API='${apiBase}', WSU='${wsBase}';
let ws, sid, lastMsg='', canTalk=false;

/* ── UI ── */
const $ = id => document.getElementById(id);
function setStatus(t,on){$('st').textContent=t;$('dot').className='dot-live'+(on?' on':'');}
function setAiBubble(t,typing=false){
  const b=$('aiBubble');
  b.textContent=t; b.className='ai-bubble show'+(typing?' typing':'');
}
function showMyBubble(t){
  const b=$('myBubble'); b.textContent=t; b.style.display='block';
}
function hideMyBubble(){$('myBubble').style.display='none';}
function setMicActive(active){
  canTalk=active;
  const btn=$('micBtn');
  btn.disabled=!active;
  $('micHint').textContent=active?'버튼을 누르고 말씀하세요':'AI가 말하는 중...';
  $('micHint').className='mic-hint'+(active?' active':'');
  $('inp').disabled=!active;
  $('sendBtn').disabled=!active;
}

/* ── 텍스트 폴백 ── */
function sendText(){
  const t=$('inp').value.trim(); if(!t||!ws) return;
  showMyBubble(t); $('inp').value='';
  setMicActive(false); setAiBubble('AI가 생각 중입니다...', true);
  ws.send(JSON.stringify({type:'userBSpeech',sessionId:sid,data:{text:t},timestamp:new Date().toISOString()}));
}
$('sendBtn').onclick=sendText;
$('inp').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();sendText();}};

/* ── PCM16 스트리밍 (push-to-talk) ── */
let audioCtx=null, processor=null, micStream=null, micOn=false;

async function ensureMicStream(){
  if(micStream) return true;
  try{
    micStream=await navigator.mediaDevices.getUserMedia(
      {audio:{channelCount:1,sampleRate:24000,echoCancellation:true,noiseSuppression:true}});
    return true;
  }catch(e){
    console.warn('마이크 권한 오류:',e);
    setStatus('마이크 권한 필요',false);
    return false;
  }
}

async function startRecording(){
  if(micOn||!canTalk) return;
  if(!await ensureMicStream()) return;
  audioCtx=new AudioContext({sampleRate:24000});
  const src=audioCtx.createMediaStreamSource(micStream);
  processor=audioCtx.createScriptProcessor(4096,1,1);
  processor.onaudioprocess=e=>{
    if(!micOn||!ws||ws.readyState!==1) return;
    const f32=e.inputBuffer.getChannelData(0);
    const i16=new Int16Array(f32.length);
    for(let i=0;i<f32.length;i++){const s=Math.max(-1,Math.min(1,f32[i]));i16[i]=s<0?s*0x8000:s*0x7FFF;}
    const bytes=new Uint8Array(i16.buffer);
    let bin=''; bytes.forEach(b=>bin+=String.fromCharCode(b));
    ws.send(JSON.stringify({type:'audioChunk',sessionId:sid,data:btoa(bin)}));
  };
  src.connect(processor); processor.connect(audioCtx.destination);
  micOn=true;
  $('micBtn').classList.add('recording');
  setStatus('말씀하세요 🔴',true);
}

function stopRecording(){
  if(!micOn) return;
  micOn=false;
  $('micBtn').classList.remove('recording');
  if(processor){processor.disconnect();processor=null;}
  if(audioCtx){audioCtx.close();audioCtx=null;}
  if(ws&&ws.readyState===1){
    ws.send(JSON.stringify({type:'audioCommit',sessionId:sid}));
    setAiBubble('AI가 생각 중입니다...', true);
    setMicActive(false);
    setStatus('처리 중...',true);
  }
}

/* ── 마이크 버튼 이벤트 (터치 + 마우스) ── */
const btn=$('micBtn');
btn.addEventListener('mousedown',e=>{e.preventDefault();startRecording();});
btn.addEventListener('touchstart',e=>{e.preventDefault();startRecording();},{passive:false});
btn.addEventListener('mouseup',stopRecording);
btn.addEventListener('touchend',stopRecording);
btn.addEventListener('mouseleave',()=>{if(micOn)stopRecording();});
btn.addEventListener('touchcancel',()=>{if(micOn)stopRecording();});

/* ── WebSocket 이벤트 ── */
function onMsg(ev){
  const e=JSON.parse(ev.data);
  if(e.type==='aiSpeech'){
    const t=e.data?.text||'';
    lastMsg=t; setAiBubble(t); hideMyBubble();
    setMicActive(false); setStatus('AI 말하는 중...',true);
  }
  if(e.type==='aiListening'){
    setMicActive(true); setStatus('내 차례',true);
    setAiBubble(lastMsg); // AI 마지막 말 유지
  }
  if(e.type==='userBSpeech'&&e.data?.text){
    showMyBubble(e.data.text); // OpenAI가 인식한 내 발화
  }
  if(e.type==='videoPlayRequested'){
    stopRecording(); micStream?.getTracks().forEach(t=>t.stop());
    $('proposal').classList.add('show');
    $('pmsg').textContent=lastMsg||'정말 고마워요 💕';
  }
}

/* ── 초기화 ── */
async function init(){
  try{
    const r=await fetch(API+'/sessions/invite/'+TOKEN);
    const d=await r.json();
    sid=d.sessionId||TOKEN;  // ★ fallback: sessionId 없으면 TOKEN 사용
  }catch(_){ sid=TOKEN; }

  ws=new WebSocket(WSU+'/sessions/'+sid+'/ws');
  ws.onopen=()=>{
    setStatus('연결됨',true);
    setAiBubble('연결됐어요! AI가 곧 시작합니다 ✨');
    ws.send(JSON.stringify({type:'userBJoined',sessionId:sid,data:{},timestamp:new Date().toISOString()}));
    // 마이크 권한 미리 요청 (첫 AI 발화 전에)
    ensureMicStream();
  };
  ws.onmessage=onMsg;
  ws.onclose=()=>setStatus('연결 끊김',false);
  ws.onerror=()=>setStatus('연결 오류',false);
}
init();
</script>
</body>
</html>`;
}

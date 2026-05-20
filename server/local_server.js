/**
 * AI Proposal 로컬 개발 서버
 *
 * server.js와 동일한 로직. 로컬 실행 시 env 없이도 동작 (localhost 기본값).
 * DB가 없으면 DEFAULT_QUESTIONS / videoUrl=null 로 폴백.
 *
 * 실행: node local_server.js
 * 의존성: npm install
 */

'use strict';

const http      = require('http');
const https     = require('https');
const crypto    = require('crypto');
const WebSocket = require('ws');
const mysql     = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

// ── 환경변수 (로컬 기본값) ───────────────────────────────────────────────────
const API_PORT    = parseInt(process.env.PORT_API    || '3000', 10);
const INVITE_PORT = parseInt(process.env.PORT_INVITE || '4000', 10);
const PUBLIC_HOST = process.env.PUBLIC_HOST || 'localhost';
const VIDEO_HOST  = process.env.VIDEO_HOST  || PUBLIC_HOST;
const INVITE_BASE = `http://${PUBLIC_HOST}:${INVITE_PORT}`;

// Solapi SMS (없으면 건너뜀)
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
  connectionLimit:    5,
  timezone:           '+09:00',
};

// ── 기본 질문 (DB에 커스텀 질문이 없을 때 사용) ──────────────────────────────
const DEFAULT_QUESTIONS = [
  { question_text: '오늘 이렇게 만나게 되어 정말 기쁩니다. 요즘 어떻게 지내셨나요?',     answer_type: 'open', expected_answer: null },
  { question_text: '처음 만났던 날을 기억하시나요? 그 때의 기억이 아직도 생생하신가요?', answer_type: 'open', expected_answer: null },
  { question_text: '앞으로 함께 하고 싶은 일이 있다면 어떤 것인가요?',                   answer_type: 'open', expected_answer: null },
  { question_text: '지금 이 순간 당신에게 가장 소중한 것은 무엇인가요?',                 answer_type: 'open', expected_answer: null },
];

const TTS_DELAY_PER_CHAR = 80;
const TTS_BASE_DELAY     = 1500;

// ── 인메모리 저장소 ──────────────────────────────────────────────────────────
const sessions  = new Map();
const tokenMap  = new Map();
const clientMap = new Map();

// ── OpenAI Realtime API ──────────────────────────────────────────────────────

function buildRealtimeSystemPrompt(questions) {
  const qList = questions.map((q, i) => {
    const aType    = q.answer_type     || 'open';
    const expected = aType === 'closed' && q.expected_answer
      ? ` (정답 키워드: ${q.expected_answer})` : '';
    return `${i + 1}. [${aType}] ${q.question_text}${expected}`;
  }).join('\n');
  return `당신은 특별한 프로포즈 경험을 연출하는 따뜻한 AI 어시스턴트입니다. 반드시 한국어로만 대화합니다.\n\n아래 질문들을 순서대로 진행하세요:\n${qList}\n\n규칙:\n- 각 질문에 답변을 듣고 1~2문장으로 따뜻하게 반응한 뒤 다음 질문으로 자연스럽게 넘어가세요\n- [closed] 타입: 정답 키워드와 의미가 비슷하면 긍정 반응, 아니면 부드럽게 재도전 유도 (1회)\n- [open] 타입: 어떤 답이든 감동적으로 반응하고 다음으로 진행\n- 모든 질문이 끝나면 마무리 한마디 후 반드시 proposal_complete 함수를 호출하세요`;
}

async function startRealtimeSession(sessionId, session) {
  if (!OPENAI_API_KEY) return false;
  const questions    = session.questions || DEFAULT_QUESTIONS;
  const systemPrompt = buildRealtimeSystemPrompt(questions);
  try {
    const rtWs = new WebSocket(
      'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17',
      { headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'OpenAI-Beta': 'realtime=v1' } }
    );
    session.realtimeWs = rtWs; session.micActive = false; session.rtTextBuf = '';
    rtWs.on('open', () => {
      log('🤖', `[RT] OpenAI Realtime 연결 [${sessionId.substring(0,8)}...]`);
      rtWs.send(JSON.stringify({
        type: 'session.update',
        session: {
          modalities: ['text'], instructions: systemPrompt,
          input_audio_format: 'pcm16',
          input_audio_transcription: { model: 'whisper-1' },
          turn_detection: null,
          tools: [{ type: 'function', name: 'proposal_complete',
            description: '모든 질문 완료 후 프로포즈 영상 재생 준비 시 호출',
            parameters: { type: 'object', properties: {}, required: [] } }],
          tool_choice: 'auto',
        },
      }));
      setTimeout(() => { if (rtWs.readyState === WebSocket.OPEN) rtWs.send(JSON.stringify({ type: 'response.create' })); }, 500);
    });
    rtWs.on('message', (raw) => { try { handleRealtimeEvent(sessionId, session, rtWs, JSON.parse(raw.toString())); } catch(_){} });
    rtWs.on('error', (err) => log('❌', `[RT] 오류: ${err.message}`));
    rtWs.on('close', () => { log('🔌', `[RT] 연결 종료`); session.realtimeWs = null; });
    return true;
  } catch (err) { log('❌', `[RT] 시작 실패: ${err.message}`); return false; }
}

function handleRealtimeEvent(sessionId, session, rtWs, event) {
  switch (event.type) {
    case 'response.text.delta':
      session.rtTextBuf = (session.rtTextBuf || '') + (event.delta || '');
      break;
    case 'response.text.done': {
      const text = (event.text || '').trim();
      if (text) { log('🤖', `[RT] AI: "${text}"`); broadcast(sessionId, makeEvent('aiSpeech', sessionId, { text })); }
      session.rtTextBuf = '';
      break;
    }
    case 'response.function_call_arguments.done':
      if (event.name === 'proposal_complete') {
        log('🎉', '[RT] proposal_complete → 영상 재생');
        rtHandleProposalComplete(sessionId, session, rtWs);
      }
      break;
    case 'conversation.item.input_audio_transcription.completed': {
      const t = (event.transcript || '').trim();
      if (t) { log('💬', `[RT] User B: "${t}"`); broadcast(sessionId, makeEvent('userBSpeech', sessionId, { text: t })); }
      break;
    }
    case 'error': log('❌', `[RT] API 오류: ${JSON.stringify(event.error)}`); break;
  }
}

async function rtHandleProposalComplete(sessionId, session, rtWs) {
  const videoUrl = await getUserVideoUrl(session.userCode) || null;
  log('🎬', `[RT] 영상: ${videoUrl}`);
  broadcast(sessionId, makeEvent('videoPlayRequested', sessionId, { videoUrl, userCode: session.userCode }));
  console.log('\n' + '='.repeat(58) + '\n🎉 프로포즈 완료! userCode: ' + session.userCode + '\n' + '='.repeat(58) + '\n');
  if (rtWs && rtWs.readyState === WebSocket.OPEN) rtWs.close();
}

// ── Claude AI (폴백) ──────────────────────────────────────────────────────────
let anthropic = null;

function initAi() {
  if (!ANTHROPIC_API_KEY) { log('⚠️', 'ANTHROPIC_API_KEY 없음 → AI 반응 기본값 사용'); return; }
  try {
    const { Anthropic } = require('@anthropic-ai/sdk');
    anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
    log('🤖', 'Claude AI 초기화 완료');
  } catch (e) { log('⚠️', `Claude AI 초기화 실패: ${e.message}`); }
}

async function generateAiReaction(question, answer, conversationHistory) {
  const qText    = question.question_text;
  const aType    = question.answer_type    || 'open';
  const expected = question.expected_answer || null;

  if (!anthropic) {
    return { response: '정말 소중한 이야기네요! 감사합니다.', moveToNext: true };
  }

  const systemPrompt = `당신은 특별한 프로포즈 경험을 연출하는 따뜻한 AI 어시스턴트입니다.
반드시 아래 JSON 형식으로만 응답하세요: {"response":"한국어 반응","moveToNext":true}

[현재 질문] ${qText}
[답변 유형] ${aType}${expected ? `\n[정답 키워드] ${expected}` : ''}

규칙:
- response: 1~2문장, 따뜻하고 감동적인 한국어
- answer_type이 'open' → moveToNext: true
- answer_type이 'closed' → 정답 키워드와 의미 일치 시 true, 아니면 false
- 오답 시 부드럽게 재도전 유도
- JSON 외 텍스트 절대 출력 금지`;

  const messages = [
    ...conversationHistory.slice(-6),
    { role: 'user', content: `사용자 답변: "${answer}"` },
  ];

  try {
    const resp = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001', max_tokens: 200, system: systemPrompt, messages,
    });
    const raw       = resp.content[0].text.trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return { response: String(parsed.response || '감사합니다.'), moveToNext: Boolean(parsed.moveToNext) };
    }
    return { response: raw.slice(0, 120), moveToNext: true };
  } catch (err) {
    log('❌', `Claude AI 오류: ${err.message}`);
    return { response: '감사합니다! 다음 이야기로 넘어가 볼게요.', moveToNext: true };
  }
}

// ── MariaDB ──────────────────────────────────────────────────────────────────
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
    const url = (rows[0].video_url || '').replace(/your-ec2-ip/gi, VIDEO_HOST);
    log('🎬', `영상 조회: user_code=${userCode}, file=${rows[0].stored_filename}`);
    return url || null;
  } catch (err) {
    log('❌', `영상 조회 오류 (user_code=${userCode}): ${err.message}`);
    return null;
  }
}

// ── Solapi SMS ───────────────────────────────────────────────────────────────
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

// ── 유틸 ─────────────────────────────────────────────────────────────────────
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

    case 'aiListening':
      if (session.realtimeWs && session.realtimeWs.readyState === WebSocket.OPEN) {
        session.micActive = true;
      }
      broadcast(sessionId, makeEvent('aiListening', sessionId));
      break;

    case 'audioChunk':
      if (session.realtimeWs
          && session.realtimeWs.readyState === WebSocket.OPEN
          && session.micActive && event.data) {
        session.realtimeWs.send(JSON.stringify({
          type: 'input_audio_buffer.append', audio: event.data,
        }));
      }
      break;

    case 'audioCommit':
      if (session.realtimeWs && session.realtimeWs.readyState === WebSocket.OPEN) {
        session.micActive = false;
        session.realtimeWs.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
        session.realtimeWs.send(JSON.stringify({ type: 'response.create' }));
        log('🎙️', '[RT] 오디오 커밋 → AI 응답 요청');
      }
      break;

    case 'userBSpeech':
      if (session.realtimeWs && session.realtimeWs.readyState === WebSocket.OPEN) {
        session.realtimeWs.send(JSON.stringify({
          type: 'conversation.item.create',
          item: { type: 'message', role: 'user',
                  content: [{ type: 'input_text', text: event.data?.text || '' }] },
        }));
        session.realtimeWs.send(JSON.stringify({ type: 'response.create' }));
      } else {
        handleUserBSpeech(sessionId, session, event.data?.text);
      }
      break;
  }
}

async function handleUserBJoined(sessionId, session) {
  if (session.userBJoined) return;
  session.userBJoined = true;
  session.conversationHistory = [];
  session.retryCount = 0;

  log('👋', `User B 접속! [userCode: ${session.userCode}]`);
  broadcast(sessionId, makeEvent('userBJoined', sessionId));

  const questions = await getUserQuestions(session.userCode);
  session.questions = questions;
  log('📋', `질문 ${questions.length}개 준비 완료`);

  if (OPENAI_API_KEY) {
    const started = await startRealtimeSession(sessionId, session);
    if (started) { log('🤖', '[RT] Realtime API로 대화 시작'); return; }
  }

  setTimeout(() => {
    const q     = session.questions[0];
    const qText = q.question_text;
    session.currentQuestion = 0;
    log('🤖', `질문 1/${session.questions.length}: "${qText}"`);
    broadcast(sessionId, makeEvent('aiSpeech', sessionId, { text: qText }));
    setTimeout(() => {
      broadcast(sessionId, makeEvent('aiListening', sessionId));
    }, ttsDelay(qText));
  }, 1000);
}

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

  const { response: aiReaction, moveToNext } = await generateAiReaction(
    currentQ, trimmed, session.conversationHistory
  );

  session.conversationHistory.push(
    { role: 'user',      content: trimmed    },
    { role: 'assistant', content: aiReaction },
  );

  const shouldAdvance = moveToNext || session.retryCount >= 1;

  setTimeout(async () => {
    broadcast(sessionId, makeEvent('aiSpeech', sessionId, { text: aiReaction }));

    if (shouldAdvance) {
      session.answers = session.answers || [];
      session.answers.push(trimmed);
      session.retryCount = 0;

      const nextIdx = session.answers.length;

      if (nextIdx < total) {
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
        const closing =
          '정말 감사합니다. 소중한 이야기를 나눠주셔서 행복했습니다. ' +
          '이제 특별히 준비한 영상을 보여드리겠습니다.';

        setTimeout(async () => {
          log('🎤', '마무리 멘트 전송');
          broadcast(sessionId, makeEvent('aiSpeech', sessionId, { text: closing }));
          const videoUrl = await getUserVideoUrl(session.userCode) || null;
          log('🎬', `영상 URL: ${videoUrl}`);
          setTimeout(() => {
            broadcast(sessionId, makeEvent('videoPlayRequested', sessionId, {
              videoUrl, userCode: session.userCode,
            }));
            console.log('\n' + '='.repeat(58));
            console.log(`🎉 프로포즈 완료! userCode: ${session.userCode}`);
            console.log('='.repeat(58) + '\n');
          }, ttsDelay(closing));
        }, ttsDelay(aiReaction));
      }

    } else {
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
        const data    = await readBody();
        const userCode = data.userCode || data.user_code || null;

        const session = {
          id:              uuidv4(),
          status:          'created',
          title:           data.title || '로컬 테스트',
          userCode,
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
        log('📋', `세션 생성 [${session.id.substring(0, 8)}...] userCode: ${userCode}`);
        res.writeHead(200); res.end(JSON.stringify(session));
        return;
      }

      // PATCH /sessions/:id ────────────────────────────────────────────────────
      if (req.method === 'PATCH' && /^\/sessions\/[^/]+$/.test(path)) {
        const sId  = path.split('/')[2];
        const data = await readBody();
        const s    = sessions.get(sId);
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

        const token   = uuidv4();
        s.inviteToken = token;
        s.status      = 'inviteSent';
        tokenMap.set(token, sId);

        const inviteUrl = `${INVITE_BASE}/invite/${token}`;

        if (s.userBPhone) {
          const title   = s.title ? `[${s.title}] ` : '';
          const smsText = `💍 ${title}특별한 초대장이 도착했어요!\n\n지금 바로 확인하세요 👇\n${inviteUrl}`;
          sendSolapiSms({ to: s.userBPhone, text: smsText })
            .catch(err => log('❌', `SMS 백그라운드 오류: ${err.message}`));
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

      // GET /users/:userCode/preview ───────────────────────────────────────────
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
  initAi();
  await initDb();
  apiServer.listen(API_PORT, '0.0.0.0', () => {
    log('🚀', `API + WS: http://${PUBLIC_HOST}:${API_PORT}`);
    console.log('\n[LOCAL] 서버 준비 완료! Flutter 앱에서 세션을 생성하세요.\n');
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
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI 어시스턴트 💍</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
         background:linear-gradient(135deg,#667eea,#764ba2);min-height:100vh;display:flex;flex-direction:column}
    .header{background:rgba(255,255,255,.15);backdrop-filter:blur(10px);padding:16px 20px;color:#fff;display:flex;align-items:center;gap:12px}
    .avatar{width:52px;height:52px;background:rgba(255,255,255,.3);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:28px}
    .hinfo h2{font-size:16px;font-weight:600}.hinfo p{font-size:12px;opacity:.8;margin-top:2px}
    .dot{width:9px;height:9px;border-radius:50%;background:#f59e0b;transition:background .3s;margin-left:auto}
    .badge{padding:4px 10px;background:rgba(255,255,255,.2);border-radius:12px;font-size:11px;color:#fff;font-weight:600;margin-left:8px}
    .chat{flex:1;padding:20px;overflow-y:auto;display:flex;flex-direction:column;gap:12px;max-height:calc(100vh - 200px)}
    .bubble{max-width:78%;padding:14px 18px;border-radius:18px;font-size:15px;line-height:1.55;animation:fu .3s ease}
    @keyframes fu{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
    .bubble.ai{background:rgba(255,255,255,.92);color:#333;border-bottom-left-radius:4px;align-self:flex-start}
    .bubble.me{background:#E91E8C;color:#fff;border-bottom-right-radius:4px;align-self:flex-end}
    .typing{display:flex;gap:5px;padding:14px 18px;background:rgba(255,255,255,.92);border-radius:18px;border-bottom-left-radius:4px;align-self:flex-start}
    .typing span{width:8px;height:8px;background:#aaa;border-radius:50%;animation:bounce .9s infinite}
    .typing span:nth-child(2){animation-delay:.3s}.typing span:nth-child(3){animation-delay:.6s}
    @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
    .input-area{background:#fff;padding:18px 20px 36px;border-radius:28px 28px 0 0;box-shadow:0 -4px 20px rgba(0,0,0,.1)}
    .hint{text-align:center;color:#888;font-size:13px;font-weight:500;margin-bottom:16px}
    .input-row{display:flex;gap:10px;align-items:center}
    input{flex:1;padding:14px 18px;border:2px solid #e0e0e0;border-radius:24px;font-size:15px;outline:none;transition:border-color .2s}
    input:focus{border-color:#6C63FF}input:disabled{background:#f5f5f5;color:#bbb}
    button{width:52px;height:52px;border-radius:50%;border:none;background:#6C63FF;color:#fff;font-size:22px;cursor:pointer;transition:background .2s;flex-shrink:0}
    button:hover{background:#5a52d5}button:disabled{background:#ddd;cursor:not-allowed}
    .proposal{display:none;flex-direction:column;align-items:center;justify-content:center;
              min-height:100vh;background:linear-gradient(180deg,#1A0030,#3D0060);color:#fff;text-align:center;padding:40px 32px}
    .proposal.show{display:flex}
    .heart{font-size:88px;animation:hb .9s infinite alternate}
    @keyframes hb{from{transform:scale(1)}to{transform:scale(1.13)}}
    .pmsg{font-size:18px;font-weight:300;line-height:1.75;margin:36px 0}
    .tvhint{padding:12px 24px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.2);border-radius:30px;font-size:14px}
    .emojis{margin-top:20px;font-size:30px;letter-spacing:8px}
  </style>
</head>
<body>
  <div id="main" style="display:flex;flex-direction:column;min-height:100vh">
    <div class="header">
      <div class="avatar" id="ai">✨</div>
      <div class="hinfo"><h2>AI 어시스턴트</h2><p id="st">연결 중...</p></div>
      <div class="dot" id="dot"></div>
      <span class="badge">LOCAL</span>
    </div>
    <div class="chat" id="chat"><div class="bubble ai">안녕하세요! 잠시 후 AI와 대화가 시작됩니다...</div></div>
    <div class="input-area">
      <p class="hint" id="hint">연결 중입니다...</p>
      <div class="input-row">
        <input id="inp" type="text" placeholder="여기에 답변을 입력하세요" disabled/>
        <button id="btn" disabled onclick="send()">&#10148;</button>
      </div>
    </div>
  </div>
  <div class="proposal" id="proposal">
    <div class="heart">💕</div>
    <p class="pmsg" id="pmsg"></p>
    <div class="tvhint">📺 TV 화면을 봐주세요</div>
    <div class="emojis">🌸 💍 🌸</div>
  </div>
<script>
const TOKEN='${token}', API='${apiBase}', WSU='${wsBase}';
let ws, sid, lastMsg='';
function addBubble(t,ai){const c=document.getElementById('chat'),d=document.createElement('div');d.className='bubble '+(ai?'ai':'me');d.textContent=t;c.appendChild(d);c.scrollTop=c.scrollHeight;}
function showTyping(){removeTyping();const c=document.getElementById('chat'),d=document.createElement('div');d.id='ty';d.className='typing';d.innerHTML='<span></span><span></span><span></span>';c.appendChild(d);c.scrollTop=c.scrollHeight;}
function removeTyping(){const t=document.getElementById('ty');if(t)t.remove();}
function setStatus(t,on){document.getElementById('st').textContent=t;document.getElementById('dot').style.background=on?'#4ade80':'#f59e0b';document.getElementById('ai').textContent=on?'🎙️':'✨';}
function setHint(h){document.getElementById('hint').textContent=h;}
function send(){const inp=document.getElementById('inp'),text=inp.value.trim();if(!text||!ws||ws.readyState!==WebSocket.OPEN)return;addBubble(text,false);inp.value='';setHint('AI가 생각 중입니다...');ws.send(JSON.stringify({type:'userBSpeech',sessionId:sid,data:{text},timestamp:new Date().toISOString()}));}
document.getElementById('inp').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}});
document.getElementById('btn').addEventListener('click',send);
let audioCtx=null,processor=null,micStream=null,micOn=false;
async function startMic(){
  if(micOn)return;
  try{
    if(!micStream)micStream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,sampleRate:24000,echoCancellation:true,noiseSuppression:true}});
    audioCtx=new AudioContext({sampleRate:24000});
    const src=audioCtx.createMediaStreamSource(micStream);
    processor=audioCtx.createScriptProcessor(4096,1,1);
    processor.onaudioprocess=e=>{
      if(!micOn||!ws||ws.readyState!==WebSocket.OPEN)return;
      const f32=e.inputBuffer.getChannelData(0),i16=new Int16Array(f32.length);
      for(let i=0;i<f32.length;i++){const s=Math.max(-1,Math.min(1,f32[i]));i16[i]=s<0?s*0x8000:s*0x7FFF;}
      const bytes=new Uint8Array(i16.buffer);let bin='';bytes.forEach(b=>bin+=String.fromCharCode(b));
      ws.send(JSON.stringify({type:'audioChunk',sessionId:sid,data:btoa(bin),timestamp:new Date().toISOString()}));
    };
    src.connect(processor);processor.connect(audioCtx.destination);
    micOn=true;setStatus('말씀하세요... 🎙️',true);setHint('AI가 듣고 있습니다. 말씀하시거나 아래에 입력하세요.');
    document.getElementById('inp').disabled=false;document.getElementById('btn').disabled=false;
  }catch(err){console.warn('마이크 오류:',err);setHint('마이크 사용 불가 — 텍스트 입력을 이용하세요.');document.getElementById('inp').disabled=false;document.getElementById('btn').disabled=false;}
}
function stopMic(){micOn=false;if(processor){processor.disconnect();processor=null;}if(audioCtx){audioCtx.close();audioCtx=null;}}
function onWsMessage(ev){
  const e=JSON.parse(ev.data);
  if(e.type==='aiSpeech'){removeTyping();lastMsg=e.data?.text||'';addBubble(lastMsg,true);setStatus('AI 말하는 중...',true);setHint('AI가 말하는 중입니다...');document.getElementById('inp').disabled=true;document.getElementById('btn').disabled=true;stopMic();}
  if(e.type==='aiListening'){setStatus('지금 말씀하세요',true);showTyping();startMic();}
  if(e.type==='userBSpeech'&&e.data?.text){removeTyping();addBubble(e.data.text,false);setHint('AI가 생각 중입니다...');}
  if(e.type==='videoPlayRequested'){stopMic();document.getElementById('main').style.display='none';document.getElementById('pmsg').textContent=lastMsg;document.getElementById('proposal').classList.add('show');}
}
async function init(){
  try{const r=await fetch(API+'/sessions/invite/'+TOKEN);const d=await r.json();sid=d.sessionId;}catch(_){sid=TOKEN;}
  ws=new WebSocket(WSU+'/sessions/'+sid+'/ws');
  ws.onopen=()=>{setStatus('연결됨',true);setHint('AI와 연결되었습니다. 잠시 후 대화가 시작됩니다.');ws.send(JSON.stringify({type:'userBJoined',sessionId:sid,data:{},timestamp:new Date().toISOString()}));};
  ws.onmessage=onWsMessage;ws.onclose=()=>{stopMic();setStatus('연결 끊김',false);};ws.onerror=()=>setStatus('연결 오류',false);
}
init();
</script>
</body>
</html>`;
}

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
const DEFAULT_QUESTIONS = [
  '오늘 이렇게 만나게 되어 정말 기쁩니다. 요즘 어떻게 지내셨나요?',
  '처음 만났던 날을 기억하시나요? 그 때의 기억이 아직도 생생하신가요?',
  '앞으로 함께 하고 싶은 일이 있다면 어떤 것인가요?',
  '지금 이 순간 당신에게 가장 소중한 것은 무엇인가요?',
];

const TTS_DELAY_PER_CHAR = 80;
const TTS_BASE_DELAY     = 1500;

// ── 인메모리 저장소 ───────────────────────────────────────────────────────────
const sessions  = new Map(); // sessionId → session 객체
const tokenMap  = new Map(); // inviteToken → sessionId
const clientMap = new Map(); // sessionId → Set<WebSocket>

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
      `SELECT question_text
       FROM   ai_questions
       WHERE  user_code = ? AND is_active = 1
       ORDER BY sort_order ASC, id ASC`,
      [userCode]
    );

    if (!rows.length) {
      log('⚠️', `user_code=${userCode} 커스텀 질문 없음 → 기본 질문 사용`);
      return [...DEFAULT_QUESTIONS];
    }

    const questions = rows.map(r => r.question_text);
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

    case 'aiListening':
      broadcast(sessionId, makeEvent('aiListening', sessionId));
      break;

    case 'userBSpeech':
      handleUserBSpeech(sessionId, session, event.data?.text);
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

  log('👋', `User B 접속! [userCode: ${session.userCode}]`);
  broadcast(sessionId, makeEvent('userBJoined', sessionId));

  // DB에서 커스텀 질문 로드 (없으면 DEFAULT_QUESTIONS 사용)
  const questions = await getUserQuestions(session.userCode);
  session.questions = questions;

  log('📋', `질문 ${questions.length}개 준비 완료`);

  // 1초 후 첫 번째 질문 전송
  setTimeout(() => {
    const q = session.questions[0];
    session.currentQuestion = 0;
    log('🤖', `질문 1/${session.questions.length}: "${q}"`);
    broadcast(sessionId, makeEvent('aiSpeech', sessionId, { text: q }));

    setTimeout(() => {
      broadcast(sessionId, makeEvent('aiListening', sessionId));
    }, ttsDelay(q));
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

  session.answers = session.answers || [];
  session.answers.push(text.trim());
  const count    = session.answers.length;
  const total    = (session.questions || DEFAULT_QUESTIONS).length;

  log('💬', `답변 ${count}/${total}: "${text}"`);

  if (count < total) {
    // 다음 질문
    const nextQ = session.questions[count];
    setTimeout(() => {
      log('🤖', `질문 ${count + 1}/${total}: "${nextQ}"`);
      broadcast(sessionId, makeEvent('aiSpeech', sessionId, { text: nextQ }));
      setTimeout(() => {
        broadcast(sessionId, makeEvent('aiListening', sessionId));
      }, ttsDelay(nextQ));
    }, 800);

  } else {
    // 모든 질문 완료 → 마무리 멘트 + DB에서 영상 URL 조회
    const closing =
      '정말 감사합니다. 소중한 이야기를 나눠주셔서 행복했습니다. ' +
      '이제 특별히 준비한 영상을 보여드리겠습니다.';

    setTimeout(async () => {
      log('🎤', '마무리 멘트 전송');
      broadcast(sessionId, makeEvent('aiSpeech', sessionId, { text: closing }));

      // user_code로 DB에서 영상 URL 조회
      const videoUrl = await getUserVideoUrl(session.userCode)
                    || 'assets/video/proposal.mp4';

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
    }, 800);
  }
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
        //           user_videos.user_code, ai_questions.user_code 와 일치해야 함
        const userCode = data.userCode || data.user_code || null;

        const session = {
          id:              uuidv4(),
          status:          'created',
          title:           data.title  || 'AI 프로포즈',
          userCode,                          // ← user_code 식별자
          videoId:         data.videoId || null,
          userBPhone:      null,
          inviteToken:     null,
          tvConnected:     false,
          userBJoined:     false,
          currentQuestion: -1,
          questions:       null,             // userBJoined 시 DB에서 로드
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
          sendSolapiSms({ to: s.userBPhone, text: smsText }).catch(() => {});
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
let ws,sid,canSend=false,lastMsg='';
function addBubble(t,ai){const c=document.getElementById('chat'),d=document.createElement('div');d.className='bubble '+(ai?'ai':'me');d.textContent=t;c.appendChild(d);c.scrollTop=c.scrollHeight;}
function showTyping(){removeTyping();const c=document.getElementById('chat'),d=document.createElement('div');d.id='ty';d.className='typing';d.innerHTML='<span></span><span></span><span></span>';c.appendChild(d);c.scrollTop=c.scrollHeight;}
function removeTyping(){const t=document.getElementById('ty');if(t)t.remove();}
function setStatus(t,on){document.getElementById('st').textContent=t;document.getElementById('dot').style.background=on?'#4ade80':'#f59e0b';document.getElementById('ai').textContent=on?'🤖':'✨';}
function setInput(en,h){document.getElementById('inp').disabled=!en;document.getElementById('btn').disabled=!en;document.getElementById('hint').textContent=h;canSend=en;if(en)document.getElementById('inp').focus();}
function send(){if(!canSend)return;const inp=document.getElementById('inp'),text=inp.value.trim();if(!text)return;addBubble(text,false);inp.value='';setInput(false,'AI가 생각 중입니다...');showTyping();ws.send(JSON.stringify({type:'userBSpeech',sessionId:sid,data:{text},timestamp:new Date().toISOString()}));}
document.getElementById('inp').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}});
async function init(){
  try{const r=await fetch(API+'/sessions/invite/'+TOKEN);const d=await r.json();sid=d.sessionId;}catch(_){sid=TOKEN;}
  ws=new WebSocket(WSU+'/sessions/'+sid+'/ws');
  ws.onopen=()=>{setStatus('연결됨',true);setInput(false,'AI가 준비 중입니다...');ws.send(JSON.stringify({type:'userBJoined',sessionId:sid,data:{},timestamp:new Date().toISOString()}));};
  ws.onmessage=e=>{const ev=JSON.parse(e.data);
    if(ev.type==='aiSpeech'){removeTyping();lastMsg=ev.data?.text||'';addBubble(lastMsg,true);setStatus('AI 말하는 중...',true);setInput(false,'AI가 말하는 중입니다...');}
    if(ev.type==='aiListening'){setStatus('지금 말씀하세요',true);setInput(true,'답변을 입력하고 Enter 또는 ▶ 버튼을 누르세요');}
    if(ev.type==='videoPlayRequested'){document.getElementById('main').style.display='none';document.getElementById('pmsg').textContent=lastMsg;document.getElementById('proposal').classList.add('show');}
  };
  ws.onclose=()=>setStatus('연결 끊김',false);ws.onerror=()=>setStatus('연결 오류',false);
}
init();
</script>
</body>
</html>`;
}

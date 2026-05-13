/**
 * AI 아바타 대화 로컬 테스트 서버
 *
 * 포트 구성:
 *   3000 → REST API + WebSocket (Flutter 앱이 연결)
 *   4000 → User B 초대 HTML 페이지 (브라우저에서 열기)
 *
 * 실행: node local_server.js
 * 의존성: npm install
 */

const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const API_PORT = 3000;
const INVITE_PORT = 4000;

// ── 4개의 질문 (순서대로 진행) ──────────────────────────────────────────────
const QUESTIONS = [
  '오늘 이렇게 만나게 되어 정말 기쁩니다. 요즘 어떻게 지내셨나요?',
  '처음 만났던 날을 기억하시나요? 그 때의 기억이 아직도 생생하신가요?',
  '앞으로 함께 하고 싶은 일이 있다면 어떤 것인가요?',
  '지금 이 순간 당신에게 가장 소중한 것은 무엇인가요?',
];

// AI TTS 완료까지 기다리는 추정 시간 (ms/글자 * 글자수 + 여유)
const TTS_DELAY_PER_CHAR = 80; // ms
const TTS_BASE_DELAY = 1500;   // ms

// ── 상태 저장소 ─────────────────────────────────────────────────────────────
const sessions = new Map();    // sessionId → session 객체
const tokenMap = new Map();    // inviteToken → sessionId
const clientMap = new Map();   // sessionId → Set<WebSocket>

// ── 유틸 ────────────────────────────────────────────────────────────────────

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
  console.log(`${emoji}  ${msg}`);
}

// ── WebSocket 서버 (포트 3000) ───────────────────────────────────────────────
const wss = new WebSocket.Server({ noServer: true });

wss.on('connection', (ws, sessionId) => {
  if (!clientMap.has(sessionId)) clientMap.set(sessionId, new Set());
  clientMap.get(sessionId).add(ws);

  log('🔌', `WS 연결 [세션: ${sessionId.substring(0, 8)}...]`);

  ws.on('message', (raw) => {
    try {
      const event = JSON.parse(raw.toString());
      handleWsEvent(sessionId, ws, event);
    } catch (_) {}
  });

  ws.on('close', () => {
    const clients = clientMap.get(sessionId);
    if (clients) clients.delete(ws);
    log('🔌', `WS 연결 종료 [세션: ${sessionId.substring(0, 8)}...]`);
  });
});

function handleWsEvent(sessionId, ws, event) {
  const session = sessions.get(sessionId);
  if (!session) return;

  switch (event.type) {

    // User B가 접속 → TV에 알림 + 1초 후 첫 번째 질문 전송
    case 'userBJoined': {
      session.userBJoined = true;
      log('👋', 'User B 접속!');
      broadcast(sessionId, makeEvent('userBJoined', sessionId));

      setTimeout(() => {
        const q = QUESTIONS[0];
        session.currentQuestion = 0;
        log('🤖', `질문 1: "${q}"`);
        broadcast(sessionId, makeEvent('aiSpeech', sessionId, { text: q }));

        // TV TTS 완료 예상 시간 후 aiListening 전송 (TV가 먼저 보내면 중복되지만 무해)
        setTimeout(() => {
          broadcast(sessionId, makeEvent('aiListening', sessionId));
          log('👂', 'AI 대기 중 → User B 입력 가능');
        }, ttsDelay(q));
      }, 1000);
      break;
    }

    // TV TTS 완료 신호 → User B에게 전달
    case 'aiListening': {
      broadcast(sessionId, makeEvent('aiListening', sessionId));
      log('👂', 'AI 대기 중 (TV TTS 완료)');
      break;
    }

    // User B 답변 → 다음 질문 or 영상 재생
    case 'userBSpeech': {
      const text = event.data?.text;
      if (!text) break;

      session.answers = session.answers || [];
      session.answers.push(text);
      const count = session.answers.length;

      log('💬', `User B 답변 ${count}/${QUESTIONS.length}: "${text}"`);

      if (count < QUESTIONS.length) {
        // 다음 질문
        const nextQ = QUESTIONS[count];
        setTimeout(() => {
          log('🤖', `질문 ${count + 1}: "${nextQ}"`);
          broadcast(sessionId, makeEvent('aiSpeech', sessionId, { text: nextQ }));

          setTimeout(() => {
            broadcast(sessionId, makeEvent('aiListening', sessionId));
            log('👂', 'AI 대기 중 → User B 입력 가능');
          }, ttsDelay(nextQ));
        }, 800);

      } else {
        // 4번 모두 완료 → closing 멘트 후 영상 재생
        const closing =
          '정말 감사합니다. 소중한 이야기를 나눠주셔서 행복했습니다. ' +
          '이제 특별히 준비한 영상을 보여드리겠습니다.';

        setTimeout(() => {
          log('🎤', `마무리 멘트: "${closing}"`);
          broadcast(sessionId, makeEvent('aiSpeech', sessionId, { text: closing }));

          // TTS 완료 예상 후 videoPlayRequested
          setTimeout(() => {
            broadcast(sessionId, makeEvent('videoPlayRequested', sessionId, {
              videoUrl: 'assets/video/proposal.mp4',
            }));
            log('🎬', '영상 재생 요청 전송 → TV에서 proposal.mp4 재생');
            console.log('\n' + '='.repeat(50));
            console.log('🎉 프로포즈 완료!');
            console.log('='.repeat(50) + '\n');
          }, ttsDelay(closing));
        }, 800);
      }
      break;
    }
  }
}

// ── HTTP API 서버 (포트 3000) ────────────────────────────────────────────────
const apiServer = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  const url = new URL(req.url, `http://localhost:${API_PORT}`);
  const path = url.pathname;

  // 바디 읽기 헬퍼
  const readBody = () => new Promise((resolve) => {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => { try { resolve(JSON.parse(body || '{}')); } catch { resolve({}); } });
  });

  (async () => {
    // POST /sessions → 세션 생성
    if (req.method === 'POST' && path === '/sessions') {
      const data = await readBody();
      const session = {
        id: uuidv4(),
        status: 'created',
        title: data.title || '로컬 테스트',
        videoId: data.videoId || null,
        userBPhone: null,
        inviteToken: null,
        tvConnected: false,
        userBJoined: false,
        currentQuestion: -1,
        answers: [],
        createdAt: new Date().toISOString(),
      };
      sessions.set(session.id, session);
      log('📋', `세션 생성: ${session.id.substring(0, 8)}...`);
      res.writeHead(200); res.end(JSON.stringify(session));
      return;
    }

    // PATCH /sessions/:id → 세션 업데이트
    if (req.method === 'PATCH' && /^\/sessions\/[^/]+$/.test(path)) {
      const sessionId = path.split('/')[2];
      const data = await readBody();
      const session = sessions.get(sessionId);
      if (!session) { res.writeHead(404); res.end('{}'); return; }
      Object.assign(session, data);
      res.writeHead(200); res.end(JSON.stringify(session));
      return;
    }

    // POST /sessions/:id/invite → 초대 토큰 생성 + 터미널 출력
    if (req.method === 'POST' && /^\/sessions\/[^/]+\/invite$/.test(path)) {
      const sessionId = path.split('/')[2];
      await readBody();
      const session = sessions.get(sessionId);
      if (!session) { res.writeHead(404); res.end('{}'); return; }

      const token = uuidv4();
      session.inviteToken = token;
      session.status = 'inviteSent';
      tokenMap.set(token, sessionId);

      const inviteUrl = `http://localhost:${INVITE_PORT}/invite/${token}`;

      console.log('\n' + '═'.repeat(56));
      console.log('📱 User B 초대 링크 (브라우저에서 열기):');
      console.log(`   ${inviteUrl}`);
      console.log('═'.repeat(56) + '\n');

      res.writeHead(200); res.end(JSON.stringify({ token, inviteUrl }));
      return;
    }

    // GET /sessions/invite/:token → sessionId 반환
    if (req.method === 'GET' && /^\/sessions\/invite\/[^/]+$/.test(path)) {
      const token = path.split('/')[3];
      const sessionId = tokenMap.get(token);
      if (!sessionId) { res.writeHead(404); res.end('{}'); return; }
      res.writeHead(200); res.end(JSON.stringify({ sessionId }));
      return;
    }

    // POST /sessions/:id/join → User B 참여 확인
    if (req.method === 'POST' && /^\/sessions\/[^/]+\/join$/.test(path)) {
      res.writeHead(200); res.end('{}');
      return;
    }

    res.writeHead(404); res.end('{}');
  })();
});

// WebSocket upgrade 처리 (apiServer에 통합)
apiServer.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url, `ws://localhost:${API_PORT}`);
  const match = url.pathname.match(/^\/sessions\/([^/]+)\/ws$/);
  if (!match) { socket.destroy(); return; }
  const sessionId = match[1];
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, sessionId);
  });
});

apiServer.listen(API_PORT, () => {
  log('🚀', `API + WebSocket 서버: http://localhost:${API_PORT}`);
});

// ── User B 초대 HTML 페이지 서버 (포트 4000) ────────────────────────────────
const invitePageServer = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${INVITE_PORT}`);
  const match = url.pathname.match(/^\/invite\/(.+)$/);

  if (!match) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found — /invite/{token} 형식으로 접속하세요');
    return;
  }

  const token = match[1];
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(buildInviteHtml(token));
});

invitePageServer.listen(INVITE_PORT, () => {
  log('🌐', `User B 초대 페이지: http://localhost:${INVITE_PORT}/invite/{token}`);
  console.log('\n' + '─'.repeat(56));
  console.log('서버 준비 완료! Flutter 앱을 실행하고 세션을 생성하세요.');
  console.log('초대 링크는 세션 생성 후 이 터미널에 출력됩니다.');
  console.log('─'.repeat(56) + '\n');
});

// ── User B 초대 HTML 페이지 생성 ─────────────────────────────────────────────
function buildInviteHtml(token) {
  return /* html */`<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI 어시스턴트 — 로컬 테스트</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
         background:linear-gradient(135deg,#667eea,#764ba2);
         min-height:100vh;display:flex;flex-direction:column}
    /* ── 헤더 ── */
    .header{background:rgba(255,255,255,.15);backdrop-filter:blur(10px);
            padding:16px 20px;color:#fff;display:flex;align-items:center;gap:12px}
    .avatar{width:48px;height:48px;background:rgba(255,255,255,.3);border-radius:50%;
            display:flex;align-items:center;justify-content:center;font-size:26px}
    .header-info h2{font-size:16px;font-weight:600}
    .header-info p{font-size:12px;opacity:.8;margin-top:2px}
    .badge{margin-left:auto;padding:4px 10px;background:rgba(255,255,255,.2);
           border-radius:12px;font-size:11px;color:#fff;font-weight:600}
    .dot{width:9px;height:9px;border-radius:50%;background:#f59e0b;transition:background .3s}
    /* ── 채팅 ── */
    .chat{flex:1;padding:20px;overflow-y:auto;display:flex;flex-direction:column;
          gap:12px;min-height:0;max-height:calc(100vh - 220px)}
    .bubble{max-width:78%;padding:14px 18px;border-radius:18px;font-size:15px;
            line-height:1.55;animation:fadeUp .3s ease}
    @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
    .bubble.ai{background:rgba(255,255,255,.92);color:#333;border-bottom-left-radius:4px;align-self:flex-start}
    .bubble.me{background:#E91E8C;color:#fff;border-bottom-right-radius:4px;align-self:flex-end}
    .typing{display:flex;gap:5px;padding:14px 18px;background:rgba(255,255,255,.92);
            border-radius:18px;border-bottom-left-radius:4px;align-self:flex-start;width:fit-content}
    .typing span{width:8px;height:8px;background:#aaa;border-radius:50%;
                 animation:bounce .9s infinite}
    .typing span:nth-child(2){animation-delay:.3s}
    .typing span:nth-child(3){animation-delay:.6s}
    @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
    /* ── 입력 영역 ── */
    .input-area{background:#fff;padding:18px 20px 36px;
                border-radius:28px 28px 0 0;box-shadow:0 -4px 20px rgba(0,0,0,.1)}
    .hint{text-align:center;color:#888;font-size:13px;font-weight:500;margin-bottom:16px}
    .input-row{display:flex;gap:10px;align-items:center}
    input{flex:1;padding:14px 18px;border:2px solid #e0e0e0;border-radius:24px;
          font-size:15px;outline:none;transition:border-color .2s}
    input:focus{border-color:#6C63FF}
    input:disabled{background:#f5f5f5;color:#bbb}
    button{width:52px;height:52px;border-radius:50%;border:none;background:#6C63FF;
           color:#fff;font-size:22px;cursor:pointer;display:flex;align-items:center;
           justify-content:center;transition:background .2s;flex-shrink:0}
    button:hover{background:#5a52d5}
    button:disabled{background:#ddd;cursor:not-allowed}
    /* ── 프로포즈 화면 ── */
    .proposal{display:none;flex-direction:column;align-items:center;justify-content:center;
              min-height:100vh;background:linear-gradient(180deg,#1A0030,#3D0060);
              color:#fff;text-align:center;padding:40px 32px}
    .proposal.show{display:flex}
    .heart{font-size:88px;animation:hb .9s infinite alternate}
    @keyframes hb{from{transform:scale(1)}to{transform:scale(1.13)}}
    .proposal-msg{font-size:18px;font-weight:300;line-height:1.75;margin:36px 0}
    .tv-hint{padding:12px 24px;background:rgba(255,255,255,.12);
             border:1px solid rgba(255,255,255,.2);border-radius:30px;
             font-size:14px;opacity:.85}
    .emoji-row{margin-top:20px;font-size:30px;letter-spacing:8px}
  </style>
</head>
<body>
  <!-- 메인 대화 화면 -->
  <div id="main" style="display:flex;flex-direction:column;min-height:100vh">
    <div class="header">
      <div class="avatar" id="avatarIcon">✨</div>
      <div class="header-info">
        <h2>AI 어시스턴트</h2>
        <p id="statusText">연결 중...</p>
      </div>
      <div class="dot" id="dot"></div>
      <span class="badge">LOCAL TEST</span>
    </div>

    <div class="chat" id="chat">
      <div class="bubble ai">안녕하세요! 잠시 후 AI와 대화가 시작됩니다...</div>
    </div>

    <div class="input-area">
      <p class="hint" id="hint">연결 중입니다...</p>
      <div class="input-row">
        <input id="inp" type="text" placeholder="여기에 답변을 입력하세요" disabled/>
        <button id="btn" disabled onclick="send()">&#10148;</button>
      </div>
    </div>
  </div>

  <!-- 프로포즈 화면 -->
  <div class="proposal" id="proposal">
    <div class="heart">💕</div>
    <p class="proposal-msg" id="proposalMsg"></p>
    <div class="tv-hint">📺 TV 화면을 봐주세요</div>
    <div class="emoji-row">🌸 💍 🌸</div>
  </div>

<script>
const TOKEN = '${token}';
const API   = 'http://localhost:3000';
const WS    = 'ws://localhost:3000';

let ws, sessionId, canSend = false, lastAiMsg = '';

/* ── UI 헬퍼 ── */
function addBubble(text, isAi) {
  const chat = document.getElementById('chat');
  const div  = document.createElement('div');
  div.className = 'bubble ' + (isAi ? 'ai' : 'me');
  div.textContent = text;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}
function showTyping() {
  removeTyping();
  const chat = document.getElementById('chat');
  const div  = document.createElement('div');
  div.id = 'typing'; div.className = 'typing';
  div.innerHTML = '<span></span><span></span><span></span>';
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}
function removeTyping() {
  const t = document.getElementById('typing');
  if (t) t.remove();
}
function setStatus(text, on) {
  document.getElementById('statusText').textContent = text;
  document.getElementById('dot').style.background = on ? '#4ade80' : '#f59e0b';
  document.getElementById('avatarIcon').textContent = on ? '🤖' : '✨';
}
function setInput(enabled, hint) {
  document.getElementById('inp').disabled  = !enabled;
  document.getElementById('btn').disabled  = !enabled;
  document.getElementById('hint').textContent = hint;
  canSend = enabled;
  if (enabled) document.getElementById('inp').focus();
}

/* ── 메시지 전송 ── */
function send() {
  if (!canSend) return;
  const inp  = document.getElementById('inp');
  const text = inp.value.trim();
  if (!text) return;
  addBubble(text, false);
  inp.value = '';
  setInput(false, 'AI가 생각 중입니다...');
  showTyping();
  ws.send(JSON.stringify({
    type: 'userBSpeech', sessionId,
    data: { text }, timestamp: new Date().toISOString(),
  }));
}
document.getElementById('inp').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
});

/* ── 연결 ── */
async function init() {
  // 토큰 → sessionId 변환
  try {
    const r = await fetch(API + '/sessions/invite/' + TOKEN);
    const d = await r.json();
    sessionId = d.sessionId;
  } catch (_) {
    sessionId = TOKEN;
  }

  ws = new WebSocket(WS + '/sessions/' + sessionId + '/ws');

  ws.onopen = () => {
    setStatus('연결됨', true);
    setInput(false, 'AI가 준비 중입니다...');
    ws.send(JSON.stringify({
      type: 'userBJoined', sessionId, data: {},
      timestamp: new Date().toISOString(),
    }));
  };

  ws.onmessage = e => {
    const ev = JSON.parse(e.data);

    if (ev.type === 'aiSpeech') {
      removeTyping();
      lastAiMsg = ev.data?.text || '';
      addBubble(lastAiMsg, true);
      setStatus('AI 말하는 중...', true);
      setInput(false, 'AI가 말하는 중입니다...');
    }

    if (ev.type === 'aiListening') {
      setStatus('지금 말씀하세요', true);
      setInput(true, '답변을 입력하고 Enter 또는 ▶ 버튼을 누르세요');
    }

    if (ev.type === 'videoPlayRequested') {
      document.getElementById('main').style.display = 'none';
      document.getElementById('proposalMsg').textContent = lastAiMsg;
      document.getElementById('proposal').classList.add('show');
    }
  };

  ws.onclose = () => setStatus('연결 끊김', false);
  ws.onerror = () => setStatus('연결 오류', false);
}

init();
</script>
</body>
</html>`;
}

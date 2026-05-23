'use strict';

const https  = require('https');
const crypto = require('crypto');

/**
 * Solapi SMS 발송
 * 환경변수: SOLAPI_API_KEY, SOLAPI_API_SECRET, SOLAPI_FROM
 *
 * @param {{ to: string, text: string }} options
 * @returns {Promise<{ success: boolean, messageId?: string, error?: string }>}
 */
function sendSms({ to, text }) {
  const apiKey    = process.env.SOLAPI_API_KEY;
  const apiSecret = process.env.SOLAPI_API_SECRET;
  const from      = (process.env.SOLAPI_FROM || '').replace(/[^0-9]/g, '');
  const cleanTo   = to.replace(/[^0-9]/g, '');

  if (!apiKey || !apiSecret || !from) {
    console.warn('[SMS] Solapi 환경변수 없음 → 발송 건너뜀');
    return Promise.resolve({ success: false, error: 'Solapi 미설정' });
  }

  const date      = new Date().toISOString();
  const salt      = crypto.randomBytes(16).toString('hex');
  const signature = crypto.createHmac('sha256', apiSecret).update(date + salt).digest('hex');
  const body      = JSON.stringify({ message: { to: cleanTo, from, text } });

  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: 'api.solapi.com',
        path:     '/messages/v4/send',
        method:   'POST',
        headers:  {
          'Content-Type':   'application/json',
          'Content-Length': Buffer.byteLength(body),
          'Authorization':  `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => { data += c; });
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (res.statusCode === 200 || res.statusCode === 201) {
              console.log(`[SMS] 발송 성공 → ${cleanTo.slice(0,3)}****${cleanTo.slice(-4)}`);
              resolve({ success: true, messageId: json.messageId });
            } else {
              console.error(`[SMS] 발송 실패 [${res.statusCode}]:`, json.errorMessage || data);
              resolve({ success: false, error: json.errorMessage || `HTTP ${res.statusCode}` });
            }
          } catch (_) {
            resolve({ success: false, error: data });
          }
        });
      }
    );
    req.on('error', (err) => {
      console.error('[SMS] 요청 오류:', err.message);
      resolve({ success: false, error: err.message });
    });
    req.write(body);
    req.end();
  });
}

module.exports = { sendSms };

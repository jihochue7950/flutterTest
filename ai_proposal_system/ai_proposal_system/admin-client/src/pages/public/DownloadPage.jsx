import React from 'react';
import { Link } from 'react-router-dom';
import './public.css';

const STEPS = [
  { title: '앱 스토어에서 검색', desc: '"AI 프로포즈" 검색 후 앱 설치', icon: '🔍' },
  { title: '앱 실행 후 로그인', desc: '주문번호와 인증코드를 입력하세요', icon: '🔑' },
  { title: '프로포즈 준비', desc: '상대방에게 보낼 링크(SMS)를 확인하세요', icon: '📱' },
  { title: '프로포즈 시작', desc: '상대방이 링크 접속 시 AI 아바타가 자동 시작됩니다', icon: '🚀' },
];

const TV_STEPS = [
  'TV와 스마트폰을 같은 Wi-Fi에 연결하세요',
  'TV에 Chromecast 기기를 연결하세요',
  '앱에서 "TV에 연결" 버튼을 누르세요',
  'TV 화면에 AI 아바타가 표시됩니다 (프리미엄 전용)',
];

export default function DownloadPage() {
  return (
    <div>
      <nav className="pub-nav">
        <a href="/" className="pub-nav-logo">💍 AI 프로포즈</a>
        <div className="pub-nav-links">
          <Link to="/products">상품 보기</Link>
          <Link to="/download" style={{ color: '#e91e63', fontWeight: 700 }}>앱 다운로드</Link>
          <Link to="/products" className="pub-nav-cta">지금 시작하기</Link>
        </div>
      </nav>

      {/* 히어로 */}
      <div style={styles.hero}>
        <h1 style={styles.heroTitle}>AI 프로포즈 앱 다운로드</h1>
        <p style={styles.heroSub}>결제 완료 후 앱을 설치하고 주문번호·인증코드로 시작하세요</p>
        <div style={styles.downloadBtns}>
          <a href="#" style={styles.storeBtn}>
            <span style={styles.storeIcon}>🍎</span>
            <div>
              <div style={styles.storeSub}>App Store에서 다운로드</div>
              <div style={styles.storeName}>iOS (iPhone)</div>
            </div>
          </a>
          <a href="#" style={styles.storeBtn}>
            <span style={styles.storeIcon}>🤖</span>
            <div>
              <div style={styles.storeSub}>Google Play에서 다운로드</div>
              <div style={styles.storeName}>Android</div>
            </div>
          </a>
        </div>
        <p style={styles.heroNote}>※ 앱은 결제 완료 고객만 이용 가능합니다</p>
      </div>

      <div className="pub-section">
        {/* 이용 방법 */}
        <h2 className="pub-section-title">이용 방법</h2>
        <p className="pub-section-sub">4단계로 쉽게 시작할 수 있어요</p>
        <div style={styles.steps}>
          {STEPS.map((s, i) => (
            <div key={i} style={styles.step}>
              <div style={styles.stepIcon}>{s.icon}</div>
              <div style={styles.stepNum}>Step {i + 1}</div>
              <h3 style={styles.stepTitle}>{s.title}</h3>
              <p style={styles.stepDesc}>{s.desc}</p>
            </div>
          ))}
        </div>

        {/* 인증코드 입력 안내 */}
        <div style={styles.authGuide}>
          <h2 style={styles.authTitle}>🔑 주문번호 · 인증코드 입력 방법</h2>
          <div style={styles.authSteps}>
            <div style={styles.authStep}>
              <div style={styles.authStepNum}>1</div>
              <div>
                <strong>앱 실행 후 "주문번호로 시작하기" 선택</strong>
                <p style={styles.authDesc}>앱 첫 화면에서 주문번호 입력 화면으로 이동합니다</p>
              </div>
            </div>
            <div style={styles.authStep}>
              <div style={styles.authStepNum}>2</div>
              <div>
                <strong>주문번호 입력</strong>
                <p style={styles.authDesc}>
                  예: <code style={styles.code}>ORDER-20260522-0001</code><br />
                  결제 완료 안내 문자 또는 이메일에서 확인하세요
                </p>
              </div>
            </div>
            <div style={styles.authStep}>
              <div style={styles.authStepNum}>3</div>
              <div>
                <strong>인증코드 입력 (8자리)</strong>
                <p style={styles.authDesc}>
                  예: <code style={styles.code}>A3F8C2D1</code><br />
                  주문 완료 화면 또는 이메일에서 확인하세요
                </p>
              </div>
            </div>
            <div style={styles.authStep}>
              <div style={{ ...styles.authStepNum, background: '#e91e63' }}>4</div>
              <div>
                <strong style={{ color: '#e91e63' }}>프로포즈 시작!</strong>
                <p style={styles.authDesc}>인증 성공 후 상대방에게 초대 링크가 자동 발송됩니다</p>
              </div>
            </div>
          </div>
        </div>

        {/* TV 연결 안내 */}
        <div style={styles.tvGuide}>
          <h2 style={styles.tvTitle}>📺 TV · Chromecast 연결 안내 (프리미엄)</h2>
          <p style={styles.tvDesc}>TV 프리미엄 패키지 구매자만 이용 가능한 기능입니다.</p>
          <div style={styles.tvSteps}>
            {TV_STEPS.map((s, i) => (
              <div key={i} style={styles.tvStep}>
                <div style={styles.tvStepNum}>{i + 1}</div>
                <span style={styles.tvStepText}>{s}</span>
              </div>
            ))}
          </div>
          <div style={styles.tvNote}>
            ※ Chromecast 기기가 없는 경우 별도 구매가 필요합니다.<br />
            ※ Google Chromecast 또는 Chromecast with Google TV를 권장합니다.
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={styles.cta}>
        <h2 style={styles.ctaTitle}>아직 상품을 구매하지 않으셨나요?</h2>
        <p style={styles.ctaSub}>지금 상품을 선택하고 특별한 프로포즈를 준비하세요</p>
        <Link to="/products" className="btn-primary">상품 보러가기 →</Link>
      </div>

      <footer className="pub-footer">
        <p>💍 AI 프로포즈 | 문의: proposal@aipropose.kr | 카카오톡: @aipropose</p>
        <p style={{ marginTop: 8 }}>
          <Link to="/admin/login">관리자</Link>
          {' · '}
          <a href="#">개인정보처리방침</a>
        </p>
      </footer>
    </div>
  );
}

const styles = {
  hero: { background: 'linear-gradient(135deg,#1a1a2e,#16213e)', padding: '80px 24px', textAlign: 'center' },
  heroTitle: { fontSize: 'clamp(26px, 5vw, 44px)', fontWeight: 900, color: '#fff', marginBottom: 16 },
  heroSub: { fontSize: 17, color: 'rgba(255,255,255,0.75)', marginBottom: 40, lineHeight: 1.6 },
  downloadBtns: { display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 24 },
  storeBtn: {
    display: 'flex', alignItems: 'center', gap: 14,
    background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 14, padding: '16px 24px', textDecoration: 'none', color: '#fff',
    minWidth: 220, transition: 'background 0.2s',
  },
  storeIcon: { fontSize: 36 },
  storeSub: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 2 },
  storeName: { fontSize: 17, fontWeight: 700 },
  heroNote: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  steps: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 60 },
  step: { background: '#fff', borderRadius: 16, padding: 24, textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' },
  stepIcon: { fontSize: 36, marginBottom: 12 },
  stepNum: { fontSize: 12, fontWeight: 700, color: '#e91e63', marginBottom: 8 },
  stepTitle: { fontSize: 16, fontWeight: 700, marginBottom: 8 },
  stepDesc: { fontSize: 13, color: '#666', lineHeight: 1.6 },
  authGuide: { background: '#fff', borderRadius: 18, padding: 32, boxShadow: '0 2px 16px rgba(0,0,0,0.07)', marginBottom: 32 },
  authTitle: { fontSize: 20, fontWeight: 800, marginBottom: 24 },
  authSteps: { display: 'flex', flexDirection: 'column', gap: 20 },
  authStep: { display: 'flex', gap: 16, alignItems: 'flex-start' },
  authStepNum: { width: 32, height: 32, background: '#1a1a2e', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 },
  authDesc: { fontSize: 13, color: '#666', marginTop: 4, lineHeight: 1.6 },
  code: { background: '#f0f4ff', padding: '2px 8px', borderRadius: 4, fontSize: 13, letterSpacing: 1 },
  tvGuide: { background: '#f0f4ff', borderRadius: 18, padding: 32, marginBottom: 32 },
  tvTitle: { fontSize: 20, fontWeight: 800, marginBottom: 8 },
  tvDesc: { fontSize: 14, color: '#666', marginBottom: 24 },
  tvSteps: { display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 },
  tvStep: { display: 'flex', gap: 14, alignItems: 'center' },
  tvStepNum: { width: 28, height: 28, background: '#3498db', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 },
  tvStepText: { fontSize: 14, color: '#333' },
  tvNote: { fontSize: 12, color: '#888', lineHeight: 1.7 },
  cta: { background: 'linear-gradient(135deg,#e91e63,#9c27b0)', padding: '60px 24px', textAlign: 'center' },
  ctaTitle: { fontSize: 26, fontWeight: 800, color: '#fff', marginBottom: 12 },
  ctaSub: { fontSize: 16, color: 'rgba(255,255,255,0.85)', marginBottom: 32 },
};

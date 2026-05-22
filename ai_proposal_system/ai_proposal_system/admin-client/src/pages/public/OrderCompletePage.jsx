import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getOrderByNumber } from '../../api/orders';
import './public.css';

export default function OrderCompletePage() {
  const { orderNumber } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOrderByNumber(orderNumber)
      .then((res) => setOrder(res.data.data))
      .finally(() => setLoading(false));
  }, [orderNumber]);

  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}>로딩 중...</div>;

  return (
    <div>
      <nav className="pub-nav">
        <a href="/" className="pub-nav-logo">💍 AI 프로포즈</a>
        <div className="pub-nav-links">
          <Link to="/products">상품 보기</Link>
          <Link to="/download">앱 다운로드</Link>
        </div>
      </nav>

      <div style={styles.container}>
        {/* 완료 헤더 */}
        <div style={styles.successBox}>
          <div style={styles.checkIcon}>✅</div>
          <h1 style={styles.title}>주문이 접수되었습니다!</h1>
          <p style={styles.sub}>
            담당자가 곧 연락드려 결제 안내를 드리겠습니다.<br />
            결제 완료 후 제작이 시작됩니다.
          </p>
        </div>

        {order && (
          <>
            {/* 주문 정보 */}
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>주문 정보</h2>
              <Row label="주문번호" value={<code style={styles.orderNum}>{order.order_number}</code>} />
              <Row label="상품명" value={order.product_name} />
              <Row label="구매자" value={order.buyer_name} />
              <Row label="연락처" value={order.phone} />
              <Row label="이메일" value={order.email} />
              <Row label="희망 날짜" value={order.proposal_date || '미정'} />
              <Row label="주문 상태" value={<span style={styles.statusBadge}>{order.order_status}</span>} />
            </div>

            {/* 인증코드 */}
            <div style={styles.codeCard}>
              <h2 style={styles.codeTitle}>🔑 앱 인증코드</h2>
              <p style={styles.codeDesc}>
                결제 완료 및 제작 준비가 완료되면 앱에서 아래 코드로 로그인하세요.
              </p>
              <div style={styles.codeBox}>
                <div style={styles.codeLabel}>주문번호</div>
                <div style={styles.codeValue}>{order.order_number}</div>
                <div style={styles.codeLabel}>인증코드</div>
                <div style={styles.codeValue}>{order.access_code}</div>
              </div>
              <p style={styles.codeNote}>
                ※ 인증코드는 위 이메일로도 발송됩니다.<br />
                ※ 앱 사용 가능 여부는 제작 완료 후 문자로 안내드립니다.
              </p>
            </div>
          </>
        )}

        {/* 다음 단계 */}
        <div style={styles.nextSteps}>
          <h2 style={styles.nextTitle}>다음 단계</h2>
          <div style={styles.steps}>
            {[
              { num: 1, title: '결제 안내 대기', desc: '담당자가 연락드려 결제 링크를 보내드립니다 (보통 1시간 내)' },
              { num: 2, title: '제작 진행', desc: '결제 완료 후 AI 아바타 개인화 설정 및 시나리오 제작이 시작됩니다' },
              { num: 3, title: '앱 다운로드', desc: '준비 완료 문자 수신 후 AI 프로포즈 앱을 설치합니다' },
              { num: 4, title: '프로포즈 시작', desc: '앱에서 주문번호 + 인증코드 입력 후 AI 프로포즈를 시작합니다', highlight: true },
            ].map((s) => (
              <div key={s.num} style={{ ...styles.step, ...(s.highlight ? styles.stepHighlight : {}) }}>
                <div style={{ ...styles.stepNum, ...(s.highlight ? styles.stepNumHighlight : {}) }}>{s.num}</div>
                <div>
                  <div style={{ ...styles.stepTitle, color: s.highlight ? '#e91e63' : '#1a1a2e' }}>{s.title}</div>
                  <div style={styles.stepDesc}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 앱 다운로드 CTA */}
        <div style={styles.downloadCta}>
          <h2 style={styles.downloadTitle}>지금 앱을 미리 설치하세요!</h2>
          <p style={styles.downloadSub}>준비 완료 알림 수신 즉시 바로 시작할 수 있습니다.</p>
          <Link to="/download" style={styles.downloadBtn}>
            📱 앱 다운로드 안내 보기
          </Link>
        </div>

        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <Link to="/" style={{ color: '#888', fontSize: 14, textDecoration: 'none' }}>← 홈으로 돌아가기</Link>
        </div>
      </div>

      <footer className="pub-footer">
        <p>💍 AI 프로포즈 | 문의: proposal@aipropose.kr</p>
      </footer>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: 15, flexWrap: 'wrap' }}>
      <span style={{ color: '#888', minWidth: 80, flexShrink: 0 }}>{label}</span>
      <span style={{ color: '#1a1a2e', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

const styles = {
  container: { maxWidth: 680, margin: '0 auto', padding: '40px 24px' },
  successBox: { textAlign: 'center', marginBottom: 40, padding: '48px 24px', background: 'linear-gradient(135deg,#fce4ec,#f3e5f5)', borderRadius: 20 },
  checkIcon: { fontSize: 56, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: 900, marginBottom: 12 },
  sub: { fontSize: 15, color: '#555', lineHeight: 1.8 },
  card: { background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 2px 16px rgba(0,0,0,0.08)', marginBottom: 24 },
  cardTitle: { fontSize: 18, fontWeight: 800, marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid #f0f0f0' },
  orderNum: { background: '#f0f4ff', padding: '3px 10px', borderRadius: 6, fontSize: 14 },
  statusBadge: { background: '#e8f5e9', color: '#2e7d32', padding: '3px 10px', borderRadius: 10, fontSize: 13, fontWeight: 600 },
  codeCard: { background: '#1a1a2e', borderRadius: 16, padding: 28, marginBottom: 24, color: '#fff' },
  codeTitle: { fontSize: 18, fontWeight: 800, marginBottom: 10 },
  codeDesc: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 20, lineHeight: 1.6 },
  codeBox: { background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 20, marginBottom: 16, display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px 16px', alignItems: 'center' },
  codeLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 600 },
  codeValue: { fontSize: 20, fontWeight: 900, letterSpacing: 2 },
  codeNote: { fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7 },
  nextSteps: { background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 2px 16px rgba(0,0,0,0.08)', marginBottom: 24 },
  nextTitle: { fontSize: 18, fontWeight: 800, marginBottom: 20 },
  steps: { display: 'flex', flexDirection: 'column', gap: 16 },
  step: { display: 'flex', gap: 16, alignItems: 'flex-start', padding: 12, borderRadius: 10 },
  stepHighlight: { background: '#fff9fb', border: '1px solid #fce4ec' },
  stepNum: { width: 28, height: 28, background: '#eee', color: '#333', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 },
  stepNumHighlight: { background: '#e91e63', color: '#fff' },
  stepTitle: { fontSize: 15, fontWeight: 700, marginBottom: 2 },
  stepDesc: { fontSize: 13, color: '#666', lineHeight: 1.5 },
  downloadCta: { background: 'linear-gradient(135deg,#e91e63,#9c27b0)', borderRadius: 16, padding: 32, textAlign: 'center', marginBottom: 24 },
  downloadTitle: { fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 10 },
  downloadSub: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginBottom: 24 },
  downloadBtn: { display: 'inline-block', background: '#fff', color: '#e91e63', padding: '14px 32px', borderRadius: 28, fontWeight: 700, fontSize: 16, textDecoration: 'none' },
};

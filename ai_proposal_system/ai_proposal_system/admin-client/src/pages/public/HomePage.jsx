import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getProducts } from '../../api/products';
import './public.css';

const STEPS = [
  { num: '01', title: '상품 선택', desc: '원하는 AI 프로포즈 유형을 선택하세요' },
  { num: '02', title: '정보 입력 & 결제', desc: '상대방 정보와 스토리를 입력하고 결제하세요' },
  { num: '03', title: '앱 다운로드', desc: '결제 완료 후 AI 프로포즈 앱을 설치하세요' },
  { num: '04', title: '프로포즈 시작', desc: '주문번호·인증코드 입력 후 실시간 AI 프로포즈!', highlight: true },
];

const REVIEWS = [
  { name: '김*준', rating: 5, text: '상대방이 눈물을 흘렸어요. AI 아바타가 너무 감동적으로 말을 전해줬고, 결국 프로포즈 성공! 정말 특별한 경험이었습니다.' },
  { name: '이*영', rating: 5, text: '생일 서프라이즈로 사용했는데 친구가 완전 놀랐어요. AI가 우리 추억을 이야기해줄 때 소름이 돋았습니다.' },
  { name: '박*현', rating: 5, text: 'TV 프리미엄 패키지로 했는데 거실 TV에 AI 아바타가 등장하는 순간 완전 영화 같았어요. 강력 추천합니다!' },
];

const FAQS = [
  { q: '실제로 AI가 대화하나요?', a: '네, 3D AI 아바타가 OpenAI 기술을 활용해 상대방과 실시간으로 자연스럽게 대화합니다. 미리 입력해 주신 추억과 스토리를 바탕으로 개인화된 대화를 진행합니다.' },
  { q: '인터넷이 없어도 이용 가능한가요?', a: '인터넷 연결이 필요합니다. AI 아바타가 실시간으로 동작하기 때문에 Wi-Fi 또는 LTE 환경이 필요합니다.' },
  { q: '결제 후 언제 이용할 수 있나요?', a: '결제 완료 후 관리자 확인 및 세팅 후 앱 사용이 활성화됩니다. 보통 1~3 영업일 내에 준비가 완료되며, 완료 시 문자로 안내해드립니다.' },
  { q: '환불은 가능한가요?', a: '세션 시작 전까지 전액 환불 가능합니다. 세션 시작 후에는 환불이 불가능합니다. 문의는 카카오톡 채널 또는 이메일로 연락 주세요.' },
  { q: 'TV에 연결할 수 있나요?', a: 'TV 프리미엄 패키지에서 Chromecast를 통한 TV 캐스팅을 지원합니다. Chromecast 기기가 필요하며, 설정 방법은 앱 다운로드 안내 페이지에서 확인하실 수 있습니다.' },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    getProducts().then((res) => setProducts((res.data.data || []).slice(0, 3)));
  }, []);

  return (
    <div>
      <nav className="pub-nav">
        <a href="/" className="pub-nav-logo">💍 AI 프로포즈</a>
        <div className="pub-nav-links">
          <Link to="/products">상품 보기</Link>
          <Link to="/download">앱 다운로드</Link>
          <Link to="/products" className="pub-nav-cta">지금 시작하기</Link>
        </div>
      </nav>

      {/* ── 히어로 ── */}
      <section style={hero.section}>
        <div style={hero.inner}>
          <div style={hero.badge}>✨ 세상에 하나뿐인 AI 프로포즈</div>
          <h1 style={hero.h1}>
            특별한 순간을<br />
            <span style={{ color: '#e91e63' }}>AI 아바타</span>와 함께
          </h1>
          <p style={hero.sub}>
            3D AI 아바타가 당신의 마음을 대신 전합니다.<br />
            개인화된 스토리와 영상으로 잊지 못할 프로포즈를 만드세요.
          </p>
          <div style={hero.btns}>
            <Link to="/products" className="btn-primary">상품 둘러보기 →</Link>
            <Link to="/download" className="btn-outline">앱 다운로드</Link>
          </div>
          <div style={hero.stats}>
            <Stat num="98%" label="성공률" />
            <Stat num="500+" label="성공 사례" />
            <Stat num="4.9★" label="평균 평점" />
          </div>
        </div>
        <div style={hero.visual}>
          <div style={hero.phone}>
            <div style={hero.phoneMock}>
              <div style={hero.avatar}>🐰</div>
              <div style={hero.bubble}>"안녕하세요! 특별한 분이 보내신 메신저예요 💝"</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 대표 상품 3개 ── */}
      <section className="pub-section" style={{ background: '#fafafa', maxWidth: '100%', padding: '80px 0' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>
          <h2 className="pub-section-title">인기 AI 프로포즈 패키지</h2>
          <p className="pub-section-sub">목적에 맞는 상품을 골라보세요</p>
          <div className="product-grid">
            {products.map((p) => <ProductCard key={p.id} product={p} navigate={navigate} />)}
          </div>
          <div style={{ textAlign: 'center', marginTop: 40 }}>
            <Link to="/products" className="btn-outline">전체 상품 보기 →</Link>
          </div>
        </div>
      </section>

      {/* ── 이용 흐름 ── */}
      <section className="pub-section">
        <h2 className="pub-section-title">어떻게 진행되나요?</h2>
        <p className="pub-section-sub">4단계로 완성하는 AI 프로포즈</p>
        <div style={flow.grid}>
          {STEPS.map((s) => (
            <div key={s.num} style={{ ...flow.card, ...(s.highlight ? flow.highlight : {}) }}>
              <div style={{ ...flow.num, color: s.highlight ? '#fff' : '#e91e63' }}>{s.num}</div>
              <h3 style={{ ...flow.title, color: s.highlight ? '#fff' : '#1a1a2e' }}>{s.title}</h3>
              <p style={{ ...flow.desc, color: s.highlight ? 'rgba(255,255,255,0.85)' : '#666' }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 후기 ── */}
      <section style={{ background: '#fff3f7', padding: '80px 0' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>
          <h2 className="pub-section-title">실제 고객 후기</h2>
          <p className="pub-section-sub">AI 프로포즈를 경험한 분들의 이야기</p>
          <div className="product-grid">
            {REVIEWS.map((r, i) => (
              <div key={i} style={review.card}>
                <div style={review.stars}>{'★'.repeat(r.rating)}</div>
                <p style={review.text}>"{r.text}"</p>
                <div style={review.name}>— {r.name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="pub-section">
        <h2 className="pub-section-title">자주 묻는 질문</h2>
        <div style={faq.list}>
          {FAQS.map((f, i) => (
            <div key={i} style={faq.item}>
              <button style={faq.question} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                <span>Q. {f.q}</span>
                <span>{openFaq === i ? '▲' : '▼'}</span>
              </button>
              {openFaq === i && <div style={faq.answer}>A. {f.a}</div>}
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA 배너 ── */}
      <section style={cta.section}>
        <h2 style={cta.title}>지금 바로 특별한 순간을 만들어보세요</h2>
        <p style={cta.sub}>AI 프로포즈로 평생 잊지 못할 감동을 선물하세요</p>
        <Link to="/products" className="btn-primary" style={{ fontSize: 18, padding: '16px 40px' }}>
          상품 선택하기 →
        </Link>
      </section>

      <footer className="pub-footer">
        <p>💍 AI 프로포즈</p>
        <p>문의: proposal@aipropose.kr | 카카오톡 채널: @aipropose</p>
        <p style={{ marginTop: 8 }}>
          <Link to="/admin/login">관리자</Link>
          {' · '}
          <a href="#">개인정보처리방침</a>
          {' · '}
          <a href="#">이용약관</a>
        </p>
        <p style={{ marginTop: 8, fontSize: 12 }}>© 2026 AI 프로포즈. All rights reserved.</p>
      </footer>
    </div>
  );
}

function Stat({ num, label }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 24, fontWeight: 800, color: '#e91e63' }}>{num}</div>
      <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>{label}</div>
    </div>
  );
}

function ProductCard({ product: p, navigate }) {
  return (
    <div style={card.wrap}>
      <div style={card.top}>
        <span style={card.price}>{p.price_label || `${p.price?.toLocaleString()}원`}</span>
        <span style={card.days}>제작 {p.production_days}일</span>
      </div>
      <h3 style={card.name}>{p.name}</h3>
      <p style={card.tagline}>{p.tagline}</p>
      <ul style={card.features}>
        {(p.features || []).slice(0, 4).map((f, i) => <li key={i} style={card.feature}>✓ {f}</li>)}
      </ul>
      <div style={card.btns}>
        <button onClick={() => navigate(`/products/${p.slug}`)} style={card.btnDetail}>자세히 보기</button>
        <button onClick={() => navigate(`/order/${p.id}`)} style={card.btnBuy}>구매하기</button>
      </div>
    </div>
  );
}

/* 인라인 스타일 */
const hero = {
  section: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 60, padding: '80px 24px 60px', maxWidth: 1100, margin: '0 auto', flexWrap: 'wrap' },
  inner: { flex: '1 1 420px', maxWidth: 560 },
  badge: { display: 'inline-block', background: '#fff0f5', color: '#e91e63', padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, marginBottom: 20 },
  h1: { fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 900, lineHeight: 1.2, marginBottom: 20 },
  sub: { fontSize: 17, color: '#555', lineHeight: 1.7, marginBottom: 32 },
  btns: { display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 40 },
  stats: { display: 'flex', gap: 32 },
  visual: { flex: '1 1 300px', display: 'flex', justifyContent: 'center' },
  phone: { position: 'relative' },
  phoneMock: { width: 260, background: 'linear-gradient(135deg,#fce4ec,#f3e5f5)', borderRadius: 24, padding: 28, boxShadow: '0 16px 48px rgba(233,30,99,0.2)', textAlign: 'center' },
  avatar: { fontSize: 80, marginBottom: 16 },
  bubble: { background: '#fff', borderRadius: 14, padding: '12px 16px', fontSize: 14, color: '#333', lineHeight: 1.6, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' },
};

const flow = {
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 },
  card: { background: '#f8f9fa', borderRadius: 14, padding: 28, textAlign: 'center' },
  highlight: { background: 'linear-gradient(135deg,#e91e63,#9c27b0)', color: '#fff' },
  num: { fontSize: 36, fontWeight: 900, marginBottom: 12 },
  title: { fontSize: 17, fontWeight: 700, marginBottom: 8 },
  desc: { fontSize: 14, lineHeight: 1.6 },
};

const card = {
  wrap: { background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column', gap: 0 },
  top: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  price: { fontSize: 18, fontWeight: 800, color: '#e91e63' },
  days: { fontSize: 12, color: '#aaa' },
  name: { fontSize: 18, fontWeight: 700, marginBottom: 8 },
  tagline: { fontSize: 14, color: '#666', marginBottom: 16, lineHeight: 1.5 },
  features: { listStyle: 'none', marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 6 },
  feature: { fontSize: 13, color: '#555' },
  btns: { display: 'flex', gap: 8, marginTop: 'auto' },
  btnDetail: { flex: 1, padding: '10px 0', background: '#f5f5f5', color: '#333', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 },
  btnBuy: { flex: 1, padding: '10px 0', background: '#e91e63', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 },
};

const review = {
  card: { background: '#fff', borderRadius: 14, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' },
  stars: { color: '#ffc107', fontSize: 18, marginBottom: 12 },
  text: { fontSize: 15, color: '#444', lineHeight: 1.7, marginBottom: 16 },
  name: { fontSize: 13, color: '#999', textAlign: 'right' },
};

const faq = {
  list: { maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 8 },
  item: { background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' },
  question: { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 600, color: '#1a1a2e', textAlign: 'left' },
  answer: { padding: '0 20px 16px', fontSize: 14, color: '#555', lineHeight: 1.7 },
};

const cta = {
  section: { background: 'linear-gradient(135deg,#e91e63,#9c27b0)', padding: '80px 24px', textAlign: 'center' },
  title: { fontSize: 'clamp(22px, 4vw, 36px)', fontWeight: 800, color: '#fff', marginBottom: 16 },
  sub: { fontSize: 17, color: 'rgba(255,255,255,0.85)', marginBottom: 36 },
};

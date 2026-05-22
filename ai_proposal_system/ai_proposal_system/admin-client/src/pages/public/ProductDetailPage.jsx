import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getProduct } from '../../api/products';
import './public.css';

export default function ProductDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMood, setSelectedMood] = useState('');

  useEffect(() => {
    getProduct(slug)
      .then((res) => { setProduct(res.data.data); })
      .catch(() => navigate('/products'))
      .finally(() => setLoading(false));
  }, [slug, navigate]);

  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}>로딩 중...</div>;
  if (!product) return null;

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

      {/* 히어로 */}
      <div style={styles.hero}>
        <div style={styles.heroInner}>
          <button onClick={() => navigate('/products')} style={styles.back}>← 상품 목록</button>
          <div style={styles.heroBadge}>{product.category}</div>
          <h1 style={styles.heroTitle}>{product.name}</h1>
          <p style={styles.heroTagline}>{product.tagline}</p>
          <div style={styles.heroPrice}>{product.price_label || `${product.price?.toLocaleString()}원`}</div>
          <div style={styles.heroDays}>제작 기간: {product.production_days}일</div>
        </div>
      </div>

      <div style={styles.body}>
        <div style={styles.main}>
          {/* 설명 */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>상품 소개</h2>
            <p style={styles.text}>{product.description}</p>
          </section>

          {/* 추천 대상 */}
          {product.target_audience && (
            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>이런 분께 추천해요</h2>
              <div style={styles.targetBox}>
                <span style={styles.targetIcon}>💡</span>
                <p style={styles.text}>{product.target_audience}</p>
              </div>
            </section>
          )}

          {/* 진행 방식 */}
          {product.how_it_works && (
            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>진행 방식</h2>
              <div style={styles.stepsWrap}>
                {product.how_it_works.split('\n').filter(Boolean).map((step, i) => (
                  <div key={i} style={styles.step}>
                    <div style={styles.stepNum}>{i + 1}</div>
                    <div style={styles.stepText}>{step.replace(/^\d+\.\s*/, '')}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 샘플 시나리오 */}
          {product.sample_scenario && (
            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>샘플 시나리오 미리보기</h2>
              <div style={styles.scenario}>
                <div style={styles.scenarioAvatar}>🐰 AI 아바타</div>
                <div style={styles.scenarioBubble}>{product.sample_scenario}</div>
              </div>
            </section>
          )}
        </div>

        {/* 사이드바: 구매 CTA */}
        <aside style={styles.sidebar}>
          <div style={styles.buyCard}>
            <div style={styles.buyPrice}>{product.price_label || `${product.price?.toLocaleString()}원`}</div>
            <div style={styles.buyDays}>제작 기간 {product.production_days}일</div>

            <h3 style={styles.featuresTitle}>포함 기능</h3>
            <ul style={styles.featureList}>
              {(product.features || []).map((f, i) => (
                <li key={i} style={styles.featureItem}><span style={styles.check}>✓</span> {f}</li>
              ))}
            </ul>

            {(product.mood_options || []).length > 0 && (
              <>
                <h3 style={styles.featuresTitle}>분위기 선택</h3>
                <div style={styles.moodGrid}>
                  {product.mood_options.map((m) => (
                    <button key={m} onClick={() => setSelectedMood(m)}
                      style={{ ...styles.moodBtn, ...(selectedMood === m ? styles.moodActive : {}) }}>
                      {m}
                    </button>
                  ))}
                </div>
              </>
            )}

            <button
              onClick={() => navigate(`/order/${product.id}`, { state: { mood: selectedMood } })}
              style={styles.btnBuy}
            >
              지금 구매하기
            </button>
            <Link to="/products" style={styles.btnBack}>다른 상품 보기</Link>

            <div style={styles.guarantee}>
              <div style={styles.guaranteeItem}>✅ 세션 전 100% 환불 보장</div>
              <div style={styles.guaranteeItem}>📱 iOS · Android 지원</div>
              <div style={styles.guaranteeItem}>📺 TV 캐스팅 지원 (프리미엄)</div>
            </div>
          </div>
        </aside>
      </div>

      <footer className="pub-footer">
        <p>💍 AI 프로포즈 | 문의: proposal@aipropose.kr</p>
      </footer>
    </div>
  );
}

const styles = {
  hero: { background: 'linear-gradient(135deg,#fce4ec,#f3e5f5)', padding: '60px 24px 48px' },
  heroInner: { maxWidth: 800, margin: '0 auto' },
  back: { background: 'none', border: 'none', color: '#e91e63', cursor: 'pointer', fontSize: 14, marginBottom: 16, padding: 0, fontWeight: 600 },
  heroBadge: { display: 'inline-block', background: '#e91e63', color: '#fff', padding: '4px 12px', borderRadius: 12, fontSize: 12, fontWeight: 600, marginBottom: 12 },
  heroTitle: { fontSize: 'clamp(24px, 4vw, 40px)', fontWeight: 900, marginBottom: 12 },
  heroTagline: { fontSize: 17, color: '#555', marginBottom: 20 },
  heroPrice: { fontSize: 28, fontWeight: 900, color: '#e91e63', marginBottom: 6 },
  heroDays: { fontSize: 14, color: '#888' },
  body: { display: 'flex', gap: 40, maxWidth: 1100, margin: '0 auto', padding: '48px 24px', alignItems: 'flex-start', flexWrap: 'wrap' },
  main: { flex: '1 1 500px' },
  section: { marginBottom: 40 },
  sectionTitle: { fontSize: 20, fontWeight: 800, marginBottom: 16, paddingBottom: 8, borderBottom: '2px solid #f5f5f5' },
  text: { fontSize: 15, color: '#444', lineHeight: 1.8 },
  targetBox: { display: 'flex', gap: 12, background: '#fff9fb', border: '1px solid #fce4ec', borderRadius: 12, padding: 16 },
  targetIcon: { fontSize: 24, flexShrink: 0 },
  stepsWrap: { display: 'flex', flexDirection: 'column', gap: 14 },
  step: { display: 'flex', alignItems: 'flex-start', gap: 14 },
  stepNum: { width: 28, height: 28, background: '#e91e63', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 },
  stepText: { fontSize: 15, color: '#444', paddingTop: 4, lineHeight: 1.6 },
  scenario: { background: '#f8f9fa', borderRadius: 14, padding: 20 },
  scenarioAvatar: { fontSize: 13, fontWeight: 700, color: '#e91e63', marginBottom: 10 },
  scenarioBubble: { background: '#fff', borderRadius: 12, padding: 16, fontSize: 14, color: '#333', lineHeight: 1.8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  sidebar: { flex: '0 0 300px', position: 'sticky', top: 76 },
  buyCard: { background: '#fff', borderRadius: 18, padding: 28, boxShadow: '0 4px 24px rgba(0,0,0,0.1)' },
  buyPrice: { fontSize: 28, fontWeight: 900, color: '#e91e63', marginBottom: 4 },
  buyDays: { fontSize: 13, color: '#aaa', marginBottom: 24 },
  featuresTitle: { fontSize: 14, fontWeight: 700, color: '#333', marginBottom: 10 },
  featureList: { listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 },
  featureItem: { display: 'flex', gap: 8, fontSize: 13, color: '#555', alignItems: 'flex-start' },
  check: { color: '#e91e63', fontWeight: 700 },
  moodGrid: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  moodBtn: { padding: '6px 14px', border: '1px solid #ddd', borderRadius: 16, background: '#fff', cursor: 'pointer', fontSize: 13 },
  moodActive: { background: '#e91e63', borderColor: '#e91e63', color: '#fff' },
  btnBuy: { width: '100%', padding: 14, background: '#e91e63', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 16, fontWeight: 700, marginBottom: 10 },
  btnBack: { display: 'block', textAlign: 'center', padding: '10px 0', color: '#888', fontSize: 14, textDecoration: 'none', marginBottom: 20 },
  guarantee: { display: 'flex', flexDirection: 'column', gap: 8 },
  guaranteeItem: { fontSize: 12, color: '#666' },
};

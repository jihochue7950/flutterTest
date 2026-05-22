import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getProducts } from '../../api/products';
import './public.css';

const CATEGORY_LABELS = {
  proposal: '💍 프로포즈', birthday: '🎂 생일', anniversary: '🌹 기념일',
  family: '👨‍👩‍👧 가족', celebration: '🎓 축하', custom: '✨ 커스텀',
};

export default function ProductsPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProducts()
      .then((res) => { setProducts(res.data.data || []); setFiltered(res.data.data || []); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setFiltered(category === 'all' ? products : products.filter((p) => p.category === category));
  }, [category, products]);

  const categories = ['all', ...new Set(products.map((p) => p.category))];

  return (
    <div>
      <nav className="pub-nav">
        <a href="/" className="pub-nav-logo">💍 AI 프로포즈</a>
        <div className="pub-nav-links">
          <Link to="/products" style={{ color: '#e91e63', fontWeight: 700 }}>상품 보기</Link>
          <Link to="/download">앱 다운로드</Link>
          <Link to="/products" className="pub-nav-cta">지금 시작하기</Link>
        </div>
      </nav>

      <div className="pub-section">
        <h1 className="pub-section-title">AI 프로포즈 상품</h1>
        <p className="pub-section-sub">목적에 맞는 상품을 선택하세요. 모든 상품은 모바일/PC에서 이용 가능합니다.</p>

        {/* 카테고리 필터 */}
        <div style={styles.filters}>
          {categories.map((c) => (
            <button key={c} onClick={() => setCategory(c)}
              style={{ ...styles.filterBtn, ...(category === c ? styles.filterActive : {}) }}>
              {c === 'all' ? '🌟 전체' : (CATEGORY_LABELS[c] || c)}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={styles.loading}>상품을 불러오는 중...</div>
        ) : filtered.length === 0 ? (
          <div style={styles.empty}>해당 카테고리에 상품이 없습니다.</div>
        ) : (
          <div className="product-grid">
            {filtered.map((p) => (
              <div key={p.id} style={styles.card}>
                <div style={styles.cardHeader}>
                  <span style={styles.category}>{CATEGORY_LABELS[p.category] || p.category}</span>
                  <span style={styles.days}>제작 {p.production_days}일</span>
                </div>
                <h2 style={styles.name}>{p.name}</h2>
                <p style={styles.tagline}>{p.tagline}</p>
                <ul style={styles.features}>
                  {(p.features || []).map((f, i) => (
                    <li key={i} style={styles.feature}>
                      <span style={styles.check}>✓</span> {f}
                    </li>
                  ))}
                </ul>
                <div style={styles.cardBottom}>
                  <div style={styles.price}>{p.price_label || `${p.price?.toLocaleString()}원`}</div>
                  <div style={styles.cardBtns}>
                    <Link to={`/products/${p.slug}`} style={styles.btnDetail}>자세히 보기</Link>
                    <button onClick={() => navigate(`/order/${p.id}`)} style={styles.btnBuy}>구매하기</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <footer className="pub-footer">
        <p>💍 AI 프로포즈</p>
        <p>문의: proposal@aipropose.kr | 카카오톡 채널: @aipropose</p>
        <p style={{ marginTop: 8 }}><Link to="/admin/login">관리자</Link></p>
      </footer>
    </div>
  );
}

const styles = {
  filters: { display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 40 },
  filterBtn: { padding: '8px 20px', borderRadius: 20, border: '2px solid #eee', background: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#555', transition: 'all 0.15s' },
  filterActive: { background: '#e91e63', borderColor: '#e91e63', color: '#fff' },
  loading: { textAlign: 'center', color: '#888', fontSize: 16, padding: 40 },
  empty: { textAlign: 'center', color: '#888', fontSize: 16, padding: 40 },
  card: {
    background: '#fff', borderRadius: 18, padding: 24,
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    display: 'flex', flexDirection: 'column', transition: 'transform 0.2s, box-shadow 0.2s',
  },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  category: { fontSize: 13, fontWeight: 600, color: '#e91e63' },
  days: { fontSize: 12, color: '#aaa', background: '#f5f5f5', padding: '3px 10px', borderRadius: 10 },
  name: { fontSize: 20, fontWeight: 800, marginBottom: 8 },
  tagline: { fontSize: 14, color: '#666', lineHeight: 1.6, marginBottom: 18 },
  features: { listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24, flex: 1 },
  feature: { display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 14, color: '#444' },
  check: { color: '#e91e63', fontWeight: 700, flexShrink: 0 },
  cardBottom: { marginTop: 'auto' },
  price: { fontSize: 24, fontWeight: 900, color: '#e91e63', marginBottom: 14 },
  cardBtns: { display: 'flex', gap: 8 },
  btnDetail: {
    flex: 1, padding: '12px 0', background: '#f5f5f5', color: '#333',
    border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600,
    textDecoration: 'none', textAlign: 'center', display: 'block',
  },
  btnBuy: {
    flex: 1, padding: '12px 0', background: '#e91e63', color: '#fff',
    border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600,
  },
};

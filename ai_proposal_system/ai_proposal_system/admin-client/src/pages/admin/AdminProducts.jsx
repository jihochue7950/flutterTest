import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { getProductsAdmin, deleteProduct, updateProduct } from '../../api/products';

export default function AdminProducts() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = () => {
    setLoading(true);
    getProductsAdmin()
      .then((res) => setProducts(res.data.data || []))
      .catch(() => alert('상품 목록 조회 실패'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProducts(); }, []);

  const handleToggleActive = async (product) => {
    try {
      await updateProduct(product.id, { is_active: product.is_active ? 0 : 1 });
      fetchProducts();
    } catch { alert('상태 변경 실패'); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`"${name}" 상품을 삭제하시겠습니까?`)) return;
    try { await deleteProduct(id); fetchProducts(); }
    catch { alert('삭제 실패'); }
  };

  return (
    <Layout>
      <div style={styles.header}>
        <h1 style={styles.title}>상품 관리</h1>
        <button onClick={() => navigate('/admin/products/new')} style={styles.btnAdd}>+ 상품 등록</button>
      </div>
      {loading ? <p>로딩 중...</p> : products.length === 0 ? (
        <p style={{ color: '#888' }}>등록된 상품이 없습니다.</p>
      ) : (
        <div style={styles.grid}>
          {products.map((p) => (
            <div key={p.id} style={{ ...styles.card, opacity: p.is_active ? 1 : 0.6 }}>
              <div style={styles.cardTop}>
                <span style={styles.emoji}>{p.name.startsWith('감동') ? '💝' : p.name.startsWith('영상') ? '🎬' : p.name.startsWith('대화') ? '💬' : p.name.startsWith('TV') ? '📺' : p.name.startsWith('생일') ? '🎂' : '🌟'}</span>
                <div style={styles.cardMeta}>
                  <span style={{ ...styles.badge, background: p.is_active ? '#e8f5e9' : '#fce4ec', color: p.is_active ? '#2e7d32' : '#c62828' }}>
                    {p.is_active ? '노출 중' : '비노출'}
                  </span>
                  <span style={styles.category}>{p.category}</span>
                </div>
              </div>
              <h3 style={styles.cardTitle}>{p.name}</h3>
              <p style={styles.tagline}>{p.tagline}</p>
              <div style={styles.cardInfo}>
                <span style={styles.price}>{p.price_label || `${p.price?.toLocaleString()}원`}</span>
                <span style={styles.days}>제작 {p.production_days}일</span>
              </div>
              <div style={styles.actions}>
                <button onClick={() => navigate(`/admin/products/${p.id}/edit`)} style={styles.btnEdit}>수정</button>
                <button onClick={() => handleToggleActive(p)} style={styles.btnToggle}>
                  {p.is_active ? '숨김' : '노출'}
                </button>
                <button onClick={() => handleDelete(p.id, p.name)} style={styles.btnDel}>삭제</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { margin: 0, fontSize: 24 },
  btnAdd: { padding: '8px 18px', background: '#e91e63', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 },
  card: { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', transition: 'opacity 0.2s' },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  emoji: { fontSize: 32 },
  cardMeta: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 },
  badge: { fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 600 },
  category: { fontSize: 11, color: '#999' },
  cardTitle: { margin: '0 0 6px', fontSize: 16, fontWeight: 700 },
  tagline: { margin: '0 0 12px', fontSize: 13, color: '#666', lineHeight: 1.4 },
  cardInfo: { display: 'flex', justifyContent: 'space-between', marginBottom: 14 },
  price: { fontWeight: 700, color: '#e91e63', fontSize: 15 },
  days: { fontSize: 12, color: '#999' },
  actions: { display: 'flex', gap: 6 },
  btnEdit: { flex: 1, padding: '7px 0', background: '#3498db', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 13 },
  btnToggle: { flex: 1, padding: '7px 0', background: '#f39c12', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 13 },
  btnDel: { flex: 1, padding: '7px 0', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 13 },
};

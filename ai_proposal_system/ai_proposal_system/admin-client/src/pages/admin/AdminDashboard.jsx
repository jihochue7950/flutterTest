import React, { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { getUsers } from '../../api/users';
import { getOrdersAdmin } from '../../api/orders';
import { getProductsAdmin } from '../../api/products';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ users: 0, orders: 0, products: 0, pendingOrders: 0 });
  const admin = JSON.parse(localStorage.getItem('admin') || '{}');

  useEffect(() => {
    Promise.allSettled([getUsers(), getOrdersAdmin(), getProductsAdmin()]).then(([u, o, p]) => {
      setStats({
        users: u.value?.data?.data?.length || 0,
        orders: o.value?.data?.data?.total || 0,
        products: p.value?.data?.data?.length || 0,
        pendingOrders: 0,
      });
    });
  }, []);

  const cards = [
    { label: '전체 주문', value: stats.orders, path: '/admin/orders', color: '#3498db' },
    { label: '등록 상품', value: stats.products, path: '/admin/products', color: '#e91e63' },
    { label: '세션 사용자', value: stats.users, path: '/admin/users', color: '#2ecc71' },
  ];

  return (
    <Layout>
      <h1 style={styles.title}>대시보드</h1>
      <p style={styles.greeting}>안녕하세요, <strong>{admin.name || admin.username}</strong>님</p>

      <div style={styles.cards}>
        {cards.map((c) => (
          <div key={c.label} style={{ ...styles.card, borderTop: `4px solid ${c.color}` }}
            onClick={() => navigate(c.path)}>
            <div style={styles.cardLabel}>{c.label}</div>
            <div style={{ ...styles.cardValue, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      <div style={styles.guide}>
        <h3 style={{ margin: '0 0 12px' }}>빠른 작업</h3>
        <div style={styles.quickActions}>
          <button onClick={() => navigate('/admin/orders')} style={styles.actionBtn}>🛒 주문 확인</button>
          <button onClick={() => navigate('/admin/products/new')} style={styles.actionBtn}>📦 상품 등록</button>
          <button onClick={() => navigate('/admin/users/new')} style={styles.actionBtn}>👤 사용자 등록</button>
          <button onClick={() => navigate('/')} style={{ ...styles.actionBtn, background: '#f0f0f0', color: '#333' }}>
            🏠 홈페이지 보기
          </button>
        </div>
      </div>
    </Layout>
  );
}

const styles = {
  title: { margin: '0 0 8px', fontSize: 24 },
  greeting: { color: '#555', marginBottom: 28, fontSize: 15 },
  cards: { display: 'flex', gap: 20, marginBottom: 32, flexWrap: 'wrap' },
  card: {
    background: '#fff', borderRadius: 10, padding: '24px 32px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)', minWidth: 160, cursor: 'pointer',
    transition: 'transform 0.15s',
  },
  cardLabel: { fontSize: 13, color: '#888', marginBottom: 8 },
  cardValue: { fontSize: 36, fontWeight: 700 },
  guide: { background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  quickActions: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  actionBtn: {
    padding: '10px 18px', background: '#1a1a2e', color: '#fff',
    border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 14,
  },
};

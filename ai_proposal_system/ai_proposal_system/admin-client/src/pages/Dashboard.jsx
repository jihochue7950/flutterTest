import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { getUsers } from '../api/users';

export default function Dashboard() {
  const [stats, setStats] = useState({ userCount: 0 });

  useEffect(() => {
    getUsers().then((res) => {
      setStats({ userCount: res.data.data?.length || 0 });
    }).catch(() => {});
  }, []);

  const admin = JSON.parse(localStorage.getItem('admin') || '{}');

  return (
    <Layout>
      <h1 style={styles.title}>대시보드</h1>
      <p style={styles.greeting}>안녕하세요, <strong>{admin.name || admin.username}</strong>님</p>
      <div style={styles.cards}>
        <div style={styles.card}>
          <div style={styles.cardLabel}>전체 사용자</div>
          <div style={styles.cardValue}>{stats.userCount}</div>
        </div>
      </div>
      <div style={styles.guide}>
        <h3>빠른 시작</h3>
        <ol style={{ paddingLeft: 20, lineHeight: 2, color: '#555' }}>
          <li>사이드바에서 <strong>사용자 등록</strong>을 클릭해 사용자를 추가하세요.</li>
          <li><strong>사용자 목록</strong>에서 사용자를 클릭해 상세 페이지로 이동하세요.</li>
          <li>상세 페이지에서 제안 영상을 업로드하고 AI 질문을 등록하세요.</li>
        </ol>
      </div>
    </Layout>
  );
}

const styles = {
  title: { margin: '0 0 8px', fontSize: 24 },
  greeting: { color: '#555', marginBottom: 28, fontSize: 15 },
  cards: { display: 'flex', gap: 20, marginBottom: 32 },
  card: {
    background: '#fff', borderRadius: 10, padding: '24px 32px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)', minWidth: 160,
  },
  cardLabel: { fontSize: 13, color: '#888', marginBottom: 8 },
  cardValue: { fontSize: 36, fontWeight: 700, color: '#1a1a2e' },
  guide: {
    background: '#fff', borderRadius: 10, padding: 24,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
};

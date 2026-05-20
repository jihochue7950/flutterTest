import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const navItems = [
  { path: '/', label: '대시보드' },
  { path: '/users', label: '사용자 목록' },
  { path: '/users/new', label: '사용자 등록' },
];

export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const admin = JSON.parse(localStorage.getItem('admin') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('admin');
    navigate('/login');
  };

  return (
    <div style={styles.container}>
      <aside style={styles.sidebar}>
        <div style={styles.logo}>AI 제안 시스템</div>
        <nav>
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              style={{
                ...styles.navItem,
                ...(location.pathname === item.path ? styles.navActive : {}),
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div style={styles.adminInfo}>
          <span>{admin.name || admin.username}</span>
          <button onClick={handleLogout} style={styles.logoutBtn}>로그아웃</button>
        </div>
      </aside>
      <main style={styles.main}>{children}</main>
    </div>
  );
}

const styles = {
  container: { display: 'flex', minHeight: '100vh', fontFamily: 'sans-serif' },
  sidebar: {
    width: 220, background: '#1a1a2e', color: '#fff',
    display: 'flex', flexDirection: 'column', padding: '0 0 20px',
  },
  logo: {
    padding: '24px 20px', fontSize: 16, fontWeight: 700,
    borderBottom: '1px solid #333', marginBottom: 8,
  },
  navItem: {
    display: 'block', padding: '12px 20px', color: '#ccc',
    textDecoration: 'none', fontSize: 14, transition: 'background 0.2s',
  },
  navActive: { background: '#16213e', color: '#fff', fontWeight: 600 },
  adminInfo: {
    marginTop: 'auto', padding: '16px 20px', borderTop: '1px solid #333',
    fontSize: 13, color: '#aaa', display: 'flex', flexDirection: 'column', gap: 8,
  },
  logoutBtn: {
    background: '#e74c3c', color: '#fff', border: 'none',
    borderRadius: 4, padding: '6px 12px', cursor: 'pointer', fontSize: 13,
  },
  main: { flex: 1, background: '#f4f6fb', padding: 32, overflowY: 'auto' },
};

import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const navItems = [
  { path: '/admin/dashboard', label: '대시보드', icon: '📊' },
  { path: '/admin/products', label: '상품 관리', icon: '📦' },
  { path: '/admin/orders', label: '주문 관리', icon: '🛒' },
  { path: '/admin/users', label: '세션 사용자', icon: '👤' },
];

export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const admin = JSON.parse(localStorage.getItem('admin') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('admin');
    navigate('/admin/login');
  };

  return (
    <div style={styles.container}>
      <aside style={{ ...styles.sidebar, width: collapsed ? 64 : 220 }}>
        <div style={styles.logoArea}>
          {!collapsed && <span style={styles.logo}>AI 프로포즈</span>}
          <button onClick={() => setCollapsed(!collapsed)} style={styles.collapseBtn}>
            {collapsed ? '▶' : '◀'}
          </button>
        </div>
        <nav>
          {navItems.map((item) => {
            const active = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{ ...styles.navItem, ...(active ? styles.navActive : {}) }}
                title={item.label}
              >
                <span style={styles.navIcon}>{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
        <div style={styles.adminInfo}>
          {!collapsed && <span style={styles.adminName}>{admin.name || admin.username}</span>}
          <button onClick={handleLogout} style={styles.logoutBtn} title="로그아웃">
            {collapsed ? '↩' : '로그아웃'}
          </button>
        </div>
      </aside>
      <main style={styles.main}>{children}</main>
    </div>
  );
}

const styles = {
  container: { display: 'flex', minHeight: '100vh', fontFamily: 'Pretendard, sans-serif' },
  sidebar: {
    background: '#1a1a2e', color: '#fff',
    display: 'flex', flexDirection: 'column', padding: '0 0 20px',
    transition: 'width 0.2s', overflow: 'hidden', flexShrink: 0,
  },
  logoArea: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '20px 16px', borderBottom: '1px solid #333', marginBottom: 8,
  },
  logo: { fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap' },
  collapseBtn: {
    background: 'none', border: 'none', color: '#aaa',
    cursor: 'pointer', fontSize: 12, padding: 4,
  },
  navItem: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '12px 16px', color: '#ccc',
    textDecoration: 'none', fontSize: 14, transition: 'background 0.15s',
    whiteSpace: 'nowrap',
  },
  navActive: { background: '#16213e', color: '#fff', fontWeight: 600 },
  navIcon: { fontSize: 18, flexShrink: 0 },
  adminInfo: {
    marginTop: 'auto', padding: '16px', borderTop: '1px solid #333',
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  adminName: { fontSize: 13, color: '#aaa', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  logoutBtn: {
    background: '#e74c3c', color: '#fff', border: 'none',
    borderRadius: 4, padding: '6px 10px', cursor: 'pointer', fontSize: 13,
  },
  main: { flex: 1, background: '#f4f6fb', padding: 32, overflowY: 'auto', minWidth: 0 },
};

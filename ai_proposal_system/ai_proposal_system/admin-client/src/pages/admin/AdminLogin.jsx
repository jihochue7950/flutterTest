import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../../api/auth';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const res = await login(form.username, form.password);
      localStorage.setItem('token', res.data.data.token);
      localStorage.setItem('admin', JSON.stringify(res.data.data.admin));
      navigate('/admin/dashboard');
    } catch (error) {
      setErr(error.response?.data?.message || '로그인 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>💍</div>
        <h2 style={styles.title}>AI 프로포즈</h2>
        <p style={styles.subtitle}>관리자 로그인</p>
        {err && <div style={styles.error}>{err}</div>}
        <form onSubmit={handleSubmit}>
          <input style={styles.input} type="text" placeholder="아이디"
            value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
          <input style={styles.input} type="password" placeholder="비밀번호"
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <button type="submit" disabled={loading} style={styles.btn}>
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
        <div style={styles.backLink}>
          <a href="/" style={styles.link}>← 홈페이지로 돌아가기</a>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f4f6fb' },
  card: { background: '#fff', padding: 40, borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.1)', width: 360 },
  logo: { textAlign: 'center', fontSize: 40, marginBottom: 8 },
  title: { textAlign: 'center', margin: '0 0 4px', fontSize: 22, color: '#1a1a2e' },
  subtitle: { textAlign: 'center', color: '#888', marginBottom: 28, fontSize: 14 },
  error: { background: '#fdecea', color: '#e74c3c', padding: '8px 12px', borderRadius: 6, marginBottom: 16, fontSize: 13 },
  input: { display: 'block', width: '100%', padding: '10px 14px', marginBottom: 14, border: '1px solid #ddd', borderRadius: 7, fontSize: 14, outline: 'none', boxSizing: 'border-box' },
  btn: { display: 'block', width: '100%', padding: 12, background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 7, fontSize: 15, cursor: 'pointer', fontWeight: 600 },
  backLink: { textAlign: 'center', marginTop: 20 },
  link: { color: '#888', fontSize: 13, textDecoration: 'none' },
};

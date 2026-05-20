import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import UserForm from '../components/UserForm';
import { createUser } from '../api/users';

export default function UserNew() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (form) => {
    setLoading(true);
    try {
      const res = await createUser(form);
      navigate(`/users/${res.data.data.id}`);
    } catch (err) {
      alert(err.response?.data?.message || '등록 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <button onClick={() => navigate('/users')} style={styles.back}>← 목록으로</button>
      <h1 style={{ margin: '0 0 24px', fontSize: 24 }}>사용자 등록</h1>
      <div style={styles.card}>
        <UserForm onSubmit={handleSubmit} loading={loading} />
      </div>
    </Layout>
  );
}

const styles = {
  back: { background: 'none', border: 'none', color: '#3498db', cursor: 'pointer', fontSize: 14, padding: '0 0 12px', display: 'block' },
  card: { background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', maxWidth: 540 },
};

import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { getUsers, deleteUser } from '../../api/users';

export default function AdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = () => {
    setLoading(true);
    getUsers()
      .then((res) => setUsers(res.data.data || []))
      .catch(() => alert('사용자 목록 조회 실패'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`"${name}"을(를) 삭제하시겠습니까?`)) return;
    try { await deleteUser(id); fetchUsers(); }
    catch { alert('삭제 실패'); }
  };

  return (
    <Layout>
      <div style={styles.header}>
        <h1 style={styles.title}>세션 사용자 목록</h1>
        <button onClick={() => navigate('/admin/users/new')} style={styles.btnAdd}>+ 사용자 등록</button>
      </div>
      {loading ? <p>로딩 중...</p> : users.length === 0 ? (
        <p style={{ color: '#888' }}>등록된 사용자가 없습니다.</p>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead><tr style={styles.thead}>
              <th style={styles.th}>ID</th><th style={styles.th}>코드</th>
              <th style={styles.th}>이름</th><th style={styles.th}>전화</th>
              <th style={styles.th}>이메일</th><th style={styles.th}>등록일</th>
              <th style={styles.th}>관리</th>
            </tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={styles.tr}>
                  <td style={styles.td}>{u.id}</td>
                  <td style={styles.td}><code>{u.user_code}</code></td>
                  <td style={styles.td}><Link to={`/admin/users/${u.id}`} style={styles.link}>{u.name}</Link></td>
                  <td style={styles.td}>{u.phone || '-'}</td>
                  <td style={styles.td}>{u.email || '-'}</td>
                  <td style={styles.td}>{new Date(u.created_at).toLocaleDateString('ko-KR')}</td>
                  <td style={styles.td}>
                    <Link to={`/admin/users/${u.id}`} style={styles.btnEdit}>상세</Link>
                    <button onClick={() => handleDelete(u.id, u.name)} style={styles.btnDel}>삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { margin: 0, fontSize: 24 },
  btnAdd: { padding: '8px 18px', background: '#3498db', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 },
  tableWrap: { background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thead: { background: '#f8f9fa' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#555', borderBottom: '1px solid #eee' },
  tr: { borderBottom: '1px solid #f0f0f0' },
  td: { padding: '12px 16px', fontSize: 14 },
  link: { color: '#3498db', textDecoration: 'none', fontWeight: 600 },
  btnEdit: { padding: '4px 10px', background: '#3498db', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, textDecoration: 'none', marginRight: 6, display: 'inline-block' },
  btnDel: { padding: '4px 10px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 },
};

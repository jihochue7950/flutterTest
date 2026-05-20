import React, { useState, useEffect } from 'react';

export default function UserForm({ initialData, onSubmit, loading }) {
  const [form, setForm] = useState({
    user_code: '', name: '', phone: '', email: '', memo: '',
    ...initialData,
  });

  useEffect(() => {
    if (initialData) setForm({ user_code: '', name: '', phone: '', email: '', memo: '', ...initialData });
  }, [initialData]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <div style={styles.field}>
        <label style={styles.label}>사용자 코드 *</label>
        <input name="user_code" value={form.user_code} onChange={handleChange}
          required style={styles.input} placeholder="예: user_a" />
      </div>
      <div style={styles.field}>
        <label style={styles.label}>이름 *</label>
        <input name="name" value={form.name} onChange={handleChange}
          required style={styles.input} placeholder="홍길동" />
      </div>
      <div style={styles.field}>
        <label style={styles.label}>전화번호</label>
        <input name="phone" value={form.phone} onChange={handleChange}
          style={styles.input} placeholder="010-0000-0000" />
      </div>
      <div style={styles.field}>
        <label style={styles.label}>이메일</label>
        <input name="email" value={form.email} onChange={handleChange}
          type="email" style={styles.input} placeholder="example@email.com" />
      </div>
      <div style={styles.field}>
        <label style={styles.label}>메모</label>
        <textarea name="memo" value={form.memo} onChange={handleChange}
          style={{ ...styles.input, height: 80, resize: 'vertical' }} />
      </div>
      <button type="submit" disabled={loading} style={styles.btn}>
        {loading ? '처리 중...' : '저장'}
      </button>
    </form>
  );
}

const styles = {
  form: { display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 480 },
  field: { display: 'flex', flexDirection: 'column', gap: 4 },
  label: { fontSize: 13, fontWeight: 600, color: '#333' },
  input: {
    padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6,
    fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box',
  },
  btn: {
    padding: '10px 24px', background: '#3498db', color: '#fff',
    border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600,
    alignSelf: 'flex-start',
  },
};

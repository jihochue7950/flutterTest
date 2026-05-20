import React, { useState, useEffect } from 'react';

const QUESTION_TYPES = ['intro', 'needs', 'budget', 'concern', 'closing', 'custom'];

export default function QuestionForm({ initialData, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({
    question_type: 'custom',
    question_text: '',
    sort_order: 0,
    is_active: 1,
    ...initialData,
  });

  useEffect(() => {
    if (initialData) setForm({ question_type: 'custom', question_text: '', sort_order: 0, is_active: 1, ...initialData });
  }, [initialData]);

  const handleChange = (e) => {
    const val = e.target.type === 'checkbox' ? (e.target.checked ? 1 : 0) : e.target.value;
    setForm({ ...form, [e.target.name]: val });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <div style={styles.row}>
        <div style={styles.field}>
          <label style={styles.label}>질문 유형</label>
          <select name="question_type" value={form.question_type} onChange={handleChange} style={styles.select}>
            {QUESTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div style={styles.field}>
          <label style={styles.label}>순서</label>
          <input name="sort_order" type="number" value={form.sort_order}
            onChange={handleChange} style={{ ...styles.input, width: 80 }} min={0} />
        </div>
        <div style={{ ...styles.field, justifyContent: 'flex-end', paddingBottom: 2 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <input type="checkbox" name="is_active" checked={form.is_active === 1}
              onChange={handleChange} />
            활성화
          </label>
        </div>
      </div>
      <div style={styles.field}>
        <label style={styles.label}>질문 내용 *</label>
        <textarea name="question_text" value={form.question_text} onChange={handleChange}
          required style={{ ...styles.input, height: 72, resize: 'vertical' }}
          placeholder="질문 내용을 입력하세요" />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" disabled={loading} style={styles.btnSave}>
          {loading ? '저장 중...' : '저장'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} style={styles.btnCancel}>취소</button>
        )}
      </div>
    </form>
  );
}

const styles = {
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  row: { display: 'flex', gap: 12, alignItems: 'flex-end' },
  field: { display: 'flex', flexDirection: 'column', gap: 4 },
  label: { fontSize: 12, fontWeight: 600, color: '#555' },
  input: {
    padding: '7px 10px', border: '1px solid #ddd', borderRadius: 5,
    fontSize: 13, outline: 'none', boxSizing: 'border-box', width: '100%',
  },
  select: {
    padding: '7px 10px', border: '1px solid #ddd', borderRadius: 5,
    fontSize: 13, outline: 'none', background: '#fff',
  },
  btnSave: {
    padding: '7px 18px', background: '#3498db', color: '#fff',
    border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 13,
  },
  btnCancel: {
    padding: '7px 18px', background: '#95a5a6', color: '#fff',
    border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 13,
  },
};

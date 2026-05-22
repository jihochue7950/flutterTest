import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import { getProductsAdmin, createProduct, updateProduct } from '../../api/products';

const CATEGORIES = ['proposal', 'birthday', 'anniversary', 'family', 'celebration', 'custom'];

export default function AdminProductForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', slug: '', category: 'proposal', tagline: '', description: '',
    price: '', price_label: '', production_days: 3,
    target_audience: '', how_it_works: '', sample_scenario: '',
    features: '', mood_options: '', is_active: 1, sort_order: 0,
  });

  useEffect(() => {
    if (!isEdit) return;
    getProductsAdmin().then((res) => {
      const product = (res.data.data || []).find((p) => String(p.id) === String(id));
      if (product) {
        setForm({
          ...product,
          features: (product.features || []).join('\n'),
          mood_options: (product.mood_options || []).join('\n'),
        });
      }
    });
  }, [id, isEdit]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        production_days: Number(form.production_days),
        sort_order: Number(form.sort_order),
        features: form.features.split('\n').map((s) => s.trim()).filter(Boolean),
        mood_options: form.mood_options.split('\n').map((s) => s.trim()).filter(Boolean),
      };
      if (isEdit) await updateProduct(id, payload);
      else await createProduct(payload);
      navigate('/admin/products');
    } catch (err) {
      alert(err.response?.data?.message || '저장 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <button onClick={() => navigate('/admin/products')} style={styles.back}>← 상품 목록으로</button>
      <h1 style={{ margin: '0 0 24px', fontSize: 24 }}>{isEdit ? '상품 수정' : '상품 등록'}</h1>
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.row}>
          <div style={styles.field}>
            <label style={styles.label}>상품명 *</label>
            <input style={styles.input} value={form.name} onChange={set('name')} required placeholder="예: 감동형 AI 프로포즈" />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>슬러그 * (URL용)</label>
            <input style={styles.input} value={form.slug} onChange={set('slug')} required placeholder="예: emotional-proposal" />
          </div>
        </div>
        <div style={styles.row}>
          <div style={styles.field}>
            <label style={styles.label}>카테고리</label>
            <select style={styles.input} value={form.category} onChange={set('category')}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>노출 순서</label>
            <input style={styles.input} type="number" value={form.sort_order} onChange={set('sort_order')} />
          </div>
        </div>
        <div style={styles.field}>
          <label style={styles.label}>한줄 소개 (tagline)</label>
          <input style={styles.input} value={form.tagline} onChange={set('tagline')} placeholder="예: AI 아바타가 당신의 마음을 대신 전합니다" />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>상품 설명</label>
          <textarea style={{ ...styles.input, height: 100, resize: 'vertical' }} value={form.description} onChange={set('description')} />
        </div>
        <div style={styles.row}>
          <div style={styles.field}>
            <label style={styles.label}>가격 (원) *</label>
            <input style={styles.input} type="number" value={form.price} onChange={set('price')} required placeholder="99000" />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>가격 표시 (price_label)</label>
            <input style={styles.input} value={form.price_label} onChange={set('price_label')} placeholder="99,000원" />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>제작 기간 (일)</label>
            <input style={styles.input} type="number" value={form.production_days} onChange={set('production_days')} />
          </div>
        </div>
        <div style={styles.field}>
          <label style={styles.label}>포함 기능 (한 줄에 하나씩)</label>
          <textarea style={{ ...styles.input, height: 100, resize: 'vertical' }} value={form.features} onChange={set('features')} placeholder={'3D AI 아바타 실시간 대화\n개인화 영상 메시지\nSMS 초대 링크'} />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>분위기 옵션 (한 줄에 하나씩)</label>
          <textarea style={{ ...styles.input, height: 70, resize: 'vertical' }} value={form.mood_options} onChange={set('mood_options')} placeholder={'로맨틱\n감동적\n따뜻한'} />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>추천 대상</label>
          <input style={styles.input} value={form.target_audience} onChange={set('target_audience')} />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>진행 방식</label>
          <textarea style={{ ...styles.input, height: 100, resize: 'vertical' }} value={form.how_it_works} onChange={set('how_it_works')} />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>샘플 시나리오</label>
          <textarea style={{ ...styles.input, height: 80, resize: 'vertical' }} value={form.sample_scenario} onChange={set('sample_scenario')} />
        </div>
        <div style={styles.row}>
          <div style={styles.field}>
            <label style={styles.label}>노출 여부</label>
            <select style={styles.input} value={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: Number(e.target.value) }))}>
              <option value={1}>노출</option>
              <option value={0}>숨김</option>
            </select>
          </div>
        </div>
        <div style={styles.actions}>
          <button type="button" onClick={() => navigate('/admin/products')} style={styles.btnCancel}>취소</button>
          <button type="submit" disabled={loading} style={styles.btnSave}>{loading ? '저장 중...' : isEdit ? '수정 완료' : '등록 완료'}</button>
        </div>
      </form>
    </Layout>
  );
}

const styles = {
  back: { background: 'none', border: 'none', color: '#3498db', cursor: 'pointer', fontSize: 14, padding: '0 0 12px', display: 'block' },
  form: { background: '#fff', borderRadius: 10, padding: 28, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', maxWidth: 800 },
  row: { display: 'flex', gap: 16, flexWrap: 'wrap' },
  field: { flex: 1, marginBottom: 16, minWidth: 200 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 6 },
  input: { display: 'block', width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', outline: 'none' },
  actions: { display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 },
  btnCancel: { padding: '10px 24px', background: '#eee', color: '#333', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 14 },
  btnSave: { padding: '10px 24px', background: '#e91e63', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 14, fontWeight: 600 },
};

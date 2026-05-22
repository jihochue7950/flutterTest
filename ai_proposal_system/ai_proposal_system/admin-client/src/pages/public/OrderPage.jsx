import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { getProduct } from '../../api/products';
import { createOrder } from '../../api/orders';
import './public.css';

export default function OrderPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    buyer_name: '', phone: '', email: '', target_name: '',
    proposal_date: '', mood: location.state?.mood || '', story: '',
    upload_required: false, request_memo: '',
  });

  useEffect(() => {
    getProduct(productId)
      .then((res) => setProduct(res.data.data))
      .catch(() => navigate('/products'))
      .finally(() => setLoading(false));
  }, [productId, navigate]);

  const set = (key) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((err) => ({ ...err, [key]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.buyer_name.trim()) e.buyer_name = '이름을 입력해주세요';
    if (!form.phone.trim()) e.phone = '연락처를 입력해주세요';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = '올바른 이메일을 입력해주세요';
    if (!form.target_name.trim()) e.target_name = '프로포즈 대상 이름을 입력해주세요';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSubmitting(true);
    try {
      const res = await createOrder({ ...form, product_id: product.id });
      const order = res.data.data;
      navigate(`/order/complete/${order.order_number}`);
    } catch (err) {
      alert(err.response?.data?.message || '주문 처리 중 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}>로딩 중...</div>;
  if (!product) return null;

  return (
    <div>
      <nav className="pub-nav">
        <a href="/" className="pub-nav-logo">💍 AI 프로포즈</a>
        <div className="pub-nav-links">
          <Link to="/products">상품 보기</Link>
          <Link to="/download">앱 다운로드</Link>
        </div>
      </nav>

      <div style={styles.container}>
        <button onClick={() => navigate(`/products/${product.slug}`)} style={styles.back}>← 상품 상세로</button>
        <h1 style={styles.title}>주문 / 결제 신청</h1>

        <div style={styles.layout}>
          {/* 주문 폼 */}
          <div style={styles.formWrap}>
            <form onSubmit={handleSubmit} className="pub-form">
              <h2 style={styles.sectionTitle}>구매자 정보</h2>

              <Field label="이름 *" error={errors.buyer_name}>
                <input type="text" value={form.buyer_name} onChange={set('buyer_name')} placeholder="홍길동" />
              </Field>
              <Field label="연락처 * (문자 발송)" error={errors.phone}>
                <input type="tel" value={form.phone} onChange={set('phone')} placeholder="010-0000-0000" />
              </Field>
              <Field label="이메일 * (주문 확인 발송)" error={errors.email}>
                <input type="email" value={form.email} onChange={set('email')} placeholder="example@email.com" />
              </Field>

              <h2 style={{ ...styles.sectionTitle, marginTop: 24 }}>프로포즈 정보</h2>

              <Field label="프로포즈 대상 이름 *" error={errors.target_name}>
                <input type="text" value={form.target_name} onChange={set('target_name')} placeholder="김민지" />
              </Field>
              <Field label="원하는 프로포즈 날짜">
                <input type="date" value={form.proposal_date} onChange={set('proposal_date')} />
              </Field>

              {(product.mood_options || []).length > 0 && (
                <Field label="원하는 분위기">
                  <div style={styles.moodGrid}>
                    {product.mood_options.map((m) => (
                      <button key={m} type="button" onClick={() => setForm((f) => ({ ...f, mood: m }))}
                        style={{ ...styles.moodBtn, ...(form.mood === m ? styles.moodActive : {}) }}>
                        {m}
                      </button>
                    ))}
                  </div>
                </Field>
              )}

              <Field label="넣고 싶은 추억 / 스토리">
                <textarea
                  value={form.story} onChange={set('story')} rows={4}
                  placeholder="두 분이 처음 만난 날, 특별한 추억, 함께한 여행지 등을 자유롭게 적어주세요. AI 아바타가 이 내용을 바탕으로 개인화된 대화를 진행합니다." />
              </Field>

              <Field label="">
                <label style={styles.checkLabel}>
                  <input type="checkbox" checked={form.upload_required} onChange={set('upload_required')} />
                  <span>영상/사진 업로드 예정 (결제 후 이메일로 전달)</span>
                </label>
              </Field>

              <Field label="추가 요청사항">
                <textarea value={form.request_memo} onChange={set('request_memo')} rows={3}
                  placeholder="특별히 요청하고 싶은 사항이 있으면 적어주세요." />
              </Field>

              {/* 결제 안내 */}
              <div style={styles.payInfo}>
                <div style={styles.payInfoTitle}>💳 결제 방식 안내</div>
                <p style={styles.payInfoText}>
                  주문 접수 후 담당자가 연락드려 결제 링크를 안내해드립니다.<br />
                  카카오페이 · 계좌이체 · 신용카드 결제 모두 가능합니다.
                </p>
              </div>

              <button type="submit" disabled={submitting} style={styles.btnSubmit}>
                {submitting ? '주문 접수 중...' : '주문 신청하기'}
              </button>
            </form>
          </div>

          {/* 상품 요약 */}
          <aside style={styles.summary}>
            <div style={styles.summaryCard}>
              <h3 style={styles.summaryTitle}>주문 상품</h3>
              <div style={styles.summaryName}>{product.name}</div>
              <div style={styles.summaryTagline}>{product.tagline}</div>
              <div style={styles.summaryDivider} />
              <div style={styles.summaryRow}>
                <span>상품 금액</span>
                <span style={{ fontWeight: 700 }}>{product.price_label || `${product.price?.toLocaleString()}원`}</span>
              </div>
              <div style={styles.summaryRow}>
                <span>제작 기간</span>
                <span>{product.production_days}일</span>
              </div>
              <div style={styles.summaryDivider} />
              <div style={styles.summaryFeatures}>
                <div style={styles.summaryFeaturesTitle}>포함 기능</div>
                {(product.features || []).map((f, i) => (
                  <div key={i} style={styles.summaryFeature}>✓ {f}</div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>

      <footer className="pub-footer">
        <p>💍 AI 프로포즈 | 주문 문의: proposal@aipropose.kr</p>
      </footer>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div style={{ marginBottom: 4 }}>
      {label && <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#555', marginBottom: 6 }}>{label}</label>}
      {children}
      {error && <div style={{ color: '#e74c3c', fontSize: 12, marginTop: 4 }}>{error}</div>}
    </div>
  );
}

const styles = {
  container: { maxWidth: 1000, margin: '0 auto', padding: '40px 24px' },
  back: { background: 'none', border: 'none', color: '#e91e63', cursor: 'pointer', fontSize: 14, marginBottom: 16, padding: 0, fontWeight: 600 },
  title: { fontSize: 28, fontWeight: 900, marginBottom: 32 },
  layout: { display: 'flex', gap: 40, alignItems: 'flex-start', flexWrap: 'wrap' },
  formWrap: { flex: '1 1 400px' },
  sectionTitle: { fontSize: 17, fontWeight: 800, marginBottom: 16, color: '#1a1a2e' },
  moodGrid: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  moodBtn: { padding: '8px 16px', border: '1px solid #ddd', borderRadius: 20, background: '#fff', cursor: 'pointer', fontSize: 14 },
  moodActive: { background: '#e91e63', borderColor: '#e91e63', color: '#fff' },
  checkLabel: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' },
  payInfo: { background: '#f0f4ff', borderRadius: 10, padding: 16, marginBottom: 8 },
  payInfoTitle: { fontWeight: 700, fontSize: 14, marginBottom: 6 },
  payInfoText: { fontSize: 13, color: '#555', lineHeight: 1.7 },
  btnSubmit: { width: '100%', padding: 16, background: '#e91e63', color: '#fff', border: 'none', borderRadius: 10, fontSize: 17, fontWeight: 700, cursor: 'pointer', marginTop: 8 },
  summary: { flex: '0 0 280px', position: 'sticky', top: 80 },
  summaryCard: { background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.09)' },
  summaryTitle: { fontSize: 14, fontWeight: 700, color: '#888', marginBottom: 12 },
  summaryName: { fontSize: 18, fontWeight: 800, marginBottom: 6 },
  summaryTagline: { fontSize: 13, color: '#666', marginBottom: 16, lineHeight: 1.5 },
  summaryDivider: { height: 1, background: '#f0f0f0', margin: '16px 0' },
  summaryRow: { display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 8 },
  summaryFeatures: { display: 'flex', flexDirection: 'column', gap: 6 },
  summaryFeaturesTitle: { fontSize: 13, fontWeight: 700, color: '#888', marginBottom: 6 },
  summaryFeature: { fontSize: 12, color: '#555' },
};

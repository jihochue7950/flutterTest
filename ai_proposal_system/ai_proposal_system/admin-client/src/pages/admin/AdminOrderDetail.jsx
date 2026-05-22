import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { getOrderAdmin, updateOrderStatus } from '../../api/orders';

const ORDER_STATUSES = ['접수','결제완료','상담중','제작중','세션준비','진행가능','완료','취소'];
const PAY_STATUSES = ['결제대기','결제완료','결제실패','환불요청','환불완료'];

export default function AdminOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [patch, setPatch] = useState({});

  useEffect(() => {
    getOrderAdmin(id)
      .then((res) => { setOrder(res.data.data); })
      .catch(() => { alert('주문 조회 실패'); navigate('/admin/orders'); })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleSave = async () => {
    if (Object.keys(patch).length === 0) return alert('변경 사항이 없습니다.');
    setSaving(true);
    try {
      const res = await updateOrderStatus(id, patch);
      setOrder(res.data.data);
      setPatch({});
      alert('저장 완료');
    } catch { alert('저장 실패'); }
    finally { setSaving(false); }
  };

  const set = (key) => (e) => setPatch((p) => ({ ...p, [key]: e.target.value }));
  const setCheck = (key) => (e) => setPatch((p) => ({ ...p, [key]: e.target.checked ? 1 : 0 }));

  if (loading) return <Layout><p>로딩 중...</p></Layout>;
  if (!order) return null;

  return (
    <Layout>
      <button onClick={() => navigate('/admin/orders')} style={styles.back}>← 주문 목록으로</button>
      <div style={styles.headerRow}>
        <h1 style={styles.title}>주문 상세</h1>
        <code style={styles.orderNum}>{order.order_number}</code>
      </div>

      <div style={styles.grid}>
        {/* 구매자 정보 */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>구매자 정보</h3>
          <Row label="이름" value={order.buyer_name} />
          <Row label="연락처" value={order.phone} />
          <Row label="이메일" value={order.email} />
          <Row label="프로포즈 대상" value={order.target_name} />
          <Row label="희망 날짜" value={order.proposal_date || '-'} />
          <Row label="원하는 분위기" value={order.mood || '-'} />
          <Row label="스토리/추억" value={order.story || '-'} />
          <Row label="영상 업로드" value={order.upload_required ? '필요' : '불필요'} />
          <Row label="추가 요청" value={order.request_memo || '-'} />
        </div>

        {/* 상태 관리 */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>상태 관리</h3>
          <div style={styles.field}>
            <label style={styles.label}>주문 상태</label>
            <select style={styles.select} defaultValue={order.order_status} onChange={set('order_status')}>
              {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>결제 상태</label>
            <select style={styles.select} defaultValue={order.payment_status} onChange={set('payment_status')}>
              {PAY_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>인증코드</label>
            <div style={styles.codeBox}>{order.access_code}</div>
          </div>
          <div style={styles.field}>
            <label style={styles.checkLabel}>
              <input type="checkbox" defaultChecked={!!order.app_access_enabled} onChange={setCheck('app_access_enabled')} />
              <span>앱 사용 허용</span>
            </label>
            <p style={styles.hint}>체크 시 고객이 앱에서 인증코드로 로그인 가능합니다.</p>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>연결 user_code (세션용)</label>
            <input style={styles.input} defaultValue={order.user_code || ''} onChange={set('user_code')} placeholder="세션 활성화 후 입력" />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>관리자 메모</label>
            <textarea style={{ ...styles.input, height: 80 }} defaultValue={order.admin_memo || ''} onChange={set('admin_memo')} />
          </div>
          <button onClick={handleSave} disabled={saving} style={styles.btnSave}>
            {saving ? '저장 중...' : '변경 사항 저장'}
          </button>
        </div>
      </div>
    </Layout>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 10, fontSize: 14 }}>
      <span style={{ color: '#888', minWidth: 110, flexShrink: 0 }}>{label}</span>
      <span style={{ color: '#333', wordBreak: 'break-word' }}>{value}</span>
    </div>
  );
}

const styles = {
  back: { background: 'none', border: 'none', color: '#3498db', cursor: 'pointer', fontSize: 14, padding: '0 0 12px', display: 'block' },
  headerRow: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 },
  title: { margin: 0, fontSize: 24 },
  orderNum: { background: '#f0f4ff', padding: '4px 10px', borderRadius: 6, fontSize: 13 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 24 },
  card: { background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  cardTitle: { margin: '0 0 16px', fontSize: 16, fontWeight: 700, borderBottom: '1px solid #eee', paddingBottom: 12 },
  field: { marginBottom: 16 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 6 },
  select: { width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14 },
  input: { width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', resize: 'vertical' },
  codeBox: { background: '#1a1a2e', color: '#fff', padding: '10px 14px', borderRadius: 6, fontSize: 18, fontWeight: 700, letterSpacing: 4, textAlign: 'center' },
  checkLabel: { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 },
  hint: { fontSize: 12, color: '#999', marginTop: 4 },
  btnSave: { width: '100%', padding: 12, background: '#e91e63', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 14, fontWeight: 600 },
};

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { getOrdersAdmin } from '../../api/orders';

const STATUS_COLORS = {
  '접수': '#90a4ae', '결제완료': '#42a5f5', '상담중': '#ffb74d',
  '제작중': '#ab47bc', '세션준비': '#26a69a', '진행가능': '#66bb6a',
  '완료': '#78909c', '취소': '#ef5350',
};
const PAY_COLORS = { '결제대기': '#ffa726', '결제완료': '#66bb6a', '결제실패': '#ef5350', '환불요청': '#ab47bc', '환불완료': '#90a4ae' };

export default function AdminOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', paymentStatus: '' });

  const fetchOrders = () => {
    setLoading(true);
    getOrdersAdmin(filters)
      .then((res) => { setOrders(res.data.data?.rows || []); setTotal(res.data.data?.total || 0); })
      .catch(() => alert('주문 목록 조회 실패'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrders(); }, [filters]);

  return (
    <Layout>
      <div style={styles.header}>
        <h1 style={styles.title}>주문 관리 <span style={styles.total}>총 {total}건</span></h1>
      </div>

      <div style={styles.filterRow}>
        <select style={styles.select} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">전체 상태</option>
          {['접수','결제완료','상담중','제작중','세션준비','진행가능','완료','취소'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select style={styles.select} value={filters.paymentStatus} onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value })}>
          <option value="">전체 결제</option>
          {['결제대기','결제완료','결제실패','환불요청','환불완료'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? <p>로딩 중...</p> : orders.length === 0 ? <p style={{ color: '#888' }}>주문이 없습니다.</p> : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead><tr style={styles.thead}>
              <th style={styles.th}>주문번호</th>
              <th style={styles.th}>상품</th>
              <th style={styles.th}>구매자</th>
              <th style={styles.th}>연락처</th>
              <th style={styles.th}>주문상태</th>
              <th style={styles.th}>결제상태</th>
              <th style={styles.th}>앱허용</th>
              <th style={styles.th}>접수일</th>
              <th style={styles.th}>관리</th>
            </tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} style={styles.tr}>
                  <td style={styles.td}><code style={styles.orderNum}>{o.order_number}</code></td>
                  <td style={styles.td}>{o.product_name}</td>
                  <td style={styles.td}>{o.buyer_name}</td>
                  <td style={styles.td}>{o.phone}</td>
                  <td style={styles.td}>
                    <span style={{ ...styles.tag, background: STATUS_COLORS[o.order_status] || '#ccc' }}>{o.order_status}</span>
                  </td>
                  <td style={styles.td}>
                    <span style={{ ...styles.tag, background: PAY_COLORS[o.payment_status] || '#ccc' }}>{o.payment_status}</span>
                  </td>
                  <td style={styles.td}>
                    <span style={{ ...styles.tag, background: o.app_access_enabled ? '#66bb6a' : '#ef5350' }}>
                      {o.app_access_enabled ? '허용' : '차단'}
                    </span>
                  </td>
                  <td style={styles.td}>{new Date(o.created_at).toLocaleDateString('ko-KR')}</td>
                  <td style={styles.td}>
                    <button onClick={() => navigate(`/admin/orders/${o.id}`)} style={styles.btnDetail}>상세</button>
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
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { margin: 0, fontSize: 24 },
  total: { fontSize: 14, color: '#888', fontWeight: 400, marginLeft: 8 },
  filterRow: { display: 'flex', gap: 12, marginBottom: 20 },
  select: { padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, background: '#fff' },
  tableWrap: { background: '#fff', borderRadius: 10, overflow: 'auto', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 900 },
  thead: { background: '#f8f9fa' },
  th: { padding: '12px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#555', borderBottom: '1px solid #eee', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid #f0f0f0' },
  td: { padding: '11px 14px', fontSize: 13 },
  orderNum: { fontSize: 12, background: '#f0f4ff', padding: '2px 6px', borderRadius: 4 },
  tag: { display: 'inline-block', color: '#fff', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 },
  btnDetail: { padding: '4px 12px', background: '#3498db', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 },
};

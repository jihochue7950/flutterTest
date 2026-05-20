import React from 'react';
import { setActiveVideo, deleteVideo } from '../api/videos';

export default function VideoList({ videos, onRefresh }) {
  const formatSize = (bytes) => {
    if (!bytes) return '-';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('ko-KR') : '-';

  const handleSetActive = async (videoId) => {
    try {
      await setActiveVideo(videoId);
      onRefresh();
    } catch {
      alert('대표 영상 변경 실패');
    }
  };

  const handleDelete = async (videoId) => {
    if (!window.confirm('영상을 삭제하시겠습니까?')) return;
    try {
      await deleteVideo(videoId);
      onRefresh();
    } catch {
      alert('영상 삭제 실패');
    }
  };

  if (!videos || videos.length === 0) {
    return <p style={{ color: '#888', fontSize: 14 }}>등록된 영상이 없습니다.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {videos.map((v) => (
        <div key={v.id} style={{
          ...styles.card,
          borderLeft: v.is_active ? '4px solid #2ecc71' : '4px solid #ddd',
        }}>
          <div style={styles.info}>
            <div style={styles.filename}>{v.original_filename}</div>
            <div style={styles.meta}>
              {formatDate(v.created_at)} · {formatSize(v.file_size)}
            </div>
            {v.is_active && <span style={styles.activeBadge}>● 대표 영상</span>}
          </div>
          <div style={styles.actions}>
            {!v.is_active && (
              <button onClick={() => handleSetActive(v.id)} style={styles.btnActive}>
                대표 설정
              </button>
            )}
            <a href={v.video_url} target="_blank" rel="noreferrer" style={styles.btnView}>
              재생
            </a>
            <button onClick={() => handleDelete(v.id)} style={styles.btnDelete}>
              삭제
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

const styles = {
  card: {
    background: '#fff', border: '1px solid #eee', borderRadius: 8,
    padding: '14px 16px', display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', gap: 12,
  },
  info: { flex: 1, minWidth: 0 },
  filename: { fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  meta: { fontSize: 12, color: '#999', marginTop: 2 },
  activeBadge: { fontSize: 12, color: '#2ecc71', marginTop: 4, display: 'block' },
  actions: { display: 'flex', gap: 8, flexShrink: 0 },
  btnActive: {
    padding: '5px 10px', background: '#2ecc71', color: '#fff',
    border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12,
  },
  btnView: {
    padding: '5px 10px', background: '#3498db', color: '#fff',
    border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12,
    textDecoration: 'none', display: 'inline-block',
  },
  btnDelete: {
    padding: '5px 10px', background: '#e74c3c', color: '#fff',
    border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12,
  },
};

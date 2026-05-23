import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPreviewJson, getProjectStatus, getDownloadUrl } from '../../api/videoCreator';
import './vc.css';

export default function PreviewPage() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const [json, setJson]     = useState(null);
  const [status, setStatus] = useState(null);
  const [dlUrl, setDlUrl]   = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getPreviewJson(id).then(r => setJson(r.data.data)).catch(() => {}),
      getProjectStatus(id).then(r => setStatus(r.data.data)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (status?.status === 'done') {
      getDownloadUrl(id).then(r => setDlUrl(r.data.data?.download_url || '')).catch(() => {});
    }
  }, [status, id]);

  // 렌더링 중 폴링
  useEffect(() => {
    if (!['rendering', 'render_queued'].includes(status?.status)) return;
    const timer = setInterval(async () => {
      const r = await getProjectStatus(id);
      setStatus(r.data.data);
      if (r.data.data?.status === 'done') clearInterval(timer);
    }, 3000);
    return () => clearInterval(timer);
  }, [status?.status, id]);

  if (loading) return <div className="vc-page"><p>로딩 중...</p></div>;

  return (
    <div className="vc-page">
      <div className="vc-header">
        <h1>🎬 영상 구성 미리보기</h1>
        <p>AI가 생성한 Scene 구성입니다. 관리자 승인 후 실제 렌더링이 시작됩니다.</p>
      </div>

      {/* 상태 배지 */}
      <div className={`vc-status-badge vc-status-${status?.status || 'draft'}`}>
        {{
          draft:          '📝 초안',
          ai_done:        '✅ AI 시나리오 완료 — 관리자 렌더링 대기 중',
          render_queued:  '⏳ 렌더링 대기 중',
          rendering:      '⚙️ 렌더링 중...',
          done:           '🎉 완성!',
          failed:         '❌ 렌더링 실패',
        }[status?.status] || status?.status}
      </div>

      {/* Scene JSON 미리보기 */}
      {json?.scene_json && (
        <section className="vc-section">
          <h2>장면 구성 ({json.scene_json.scenes?.length}개 장면)</h2>
          <div className="vc-scenes">
            {json.scene_json.scenes?.map(scene => (
              <div key={scene.sceneId} className="vc-scene-card">
                <div className="vc-scene-header">
                  <span className="vc-scene-num">{scene.sceneId}</span>
                  <strong>{scene.title}</strong>
                  <span className="vc-scene-duration">{scene.duration}초</span>
                </div>
                <p className="vc-scene-subtitle">"{scene.subtitle}"</p>
                <div className="vc-scene-meta">
                  사진 {scene.photos?.length}장 · {scene.transition} · {scene.effect}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* AI 시나리오 */}
      {json?.ai_scenario && (
        <section className="vc-section">
          <h2>AI 생성 시나리오</h2>
          <pre className="vc-scenario-box">{json.ai_scenario}</pre>
        </section>
      )}

      {/* 완성 영상 다운로드 */}
      {dlUrl && (
        <section className="vc-section">
          <h2>🎉 완성 영상</h2>
          <video src={dlUrl} controls style={{ width: '100%', maxWidth: 640, borderRadius: 12 }} />
          <br />
          <a className="vc-btn-primary" href={dlUrl} download>⬇️ 영상 다운로드</a>
        </section>
      )}

      <div className="vc-actions">
        <button className="vc-btn-secondary" onClick={() => navigate(`/video-creator/${id}/scenario`)}>← 이전</button>
        <button className="vc-btn-outline" onClick={() => navigate('/video-creator')}>처음으로</button>
      </div>
    </div>
  );
}

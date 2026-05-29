import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getStatus, regenerateScene, finalizeProject } from '../../api/aiVideo';
import './aiv.css';

const SCENE_STATUS = {
  pending:    { label: '⏳ 대기 중',  cls: 'pending' },
  generating: { label: '⚙️ 생성 중',  cls: 'generating' },
  done:       { label: '✅ 완료',     cls: 'done' },
  failed:     { label: '❌ 실패',     cls: 'failed' },
};

export default function AIVideoMonitor() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const [status,  setStatus]   = useState(null);
  const [loading, setLoading]  = useState(true);
  const timerRef  = useRef(null);

  const fetchStatus = useCallback(async () => {
    try {
      const r = await getStatus(id);
      setStatus(r.data.data);
      // 생성 완료/실패면 폴링 중단
      if (['done', 'failed'].includes(r.data.data?.status)) {
        clearInterval(timerRef.current);
      }
    } catch (_) {}
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => {
    fetchStatus();
    // 3초마다 폴링
    timerRef.current = setInterval(fetchStatus, 3000);
    return () => clearInterval(timerRef.current);
  }, [fetchStatus]);

  const handleRegenerate = async (sceneId) => {
    await regenerateScene(sceneId);
    fetchStatus();
  };

  const handleFinalize = async () => {
    await finalizeProject(id);
    fetchStatus();
  };

  if (loading || !status) return <div className="aiv-page"><p>로딩 중...</p></div>;

  const pct = status.total_scenes > 0
    ? Math.round((status.completed_scenes / status.total_scenes) * 100)
    : 0;
  const doneScenes = (status.scenes || []).filter(s => s.status === 'done');

  return (
    <div className="aiv-page">
      <div className="aiv-header">
        <h1>📊 생성 진행 상태</h1>
        <button className="aiv-btn-secondary" onClick={() => navigate(`/admin/ai-video/${id}`)}>← 프로젝트</button>
      </div>

      {/* 전체 진행률 */}
      <section className="aiv-section">
        <div className="aiv-progress-header">
          <span className={`aiv-badge aiv-badge-${status.status}`}>
            {{ draft:'초안', generating:'생성 중', done:'완성', failed:'실패' }[status.status]}
          </span>
          <span className="aiv-progress-label">{status.completed_scenes} / {status.total_scenes} 장면 완료</span>
        </div>
        <div className="aiv-progress-track">
          <div className="aiv-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <p className="aiv-hint">{status.status === 'generating' ? '3초마다 자동 갱신됩니다.' : ''}</p>
      </section>

      {/* 장면별 상태 */}
      <section className="aiv-section">
        <h2>장면별 진행 현황</h2>
        <div className="aiv-monitor-grid">
          {(status.scenes || []).map(s => {
            const st = SCENE_STATUS[s.status] || { label: s.status, cls: 'pending' };
            return (
              <div key={s.id} className={`aiv-monitor-card aiv-monitor-${st.cls}`}>
                <div className="aiv-monitor-num">Scene {s.scene_order}</div>
                <div className={`aiv-monitor-status aiv-monitor-status-${st.cls}`}>{st.label}</div>
                {s.video_url && (
                  <video src={s.video_url} controls className="aiv-monitor-video" />
                )}
                {s.error_message && (
                  <div className="aiv-scene-err">{s.error_message}</div>
                )}
                {s.status === 'failed' && (
                  <button className="aiv-btn-sm" onClick={() => handleRegenerate(s.id)}>
                    🔄 재생성
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 최종 영상 합치기 */}
      {doneScenes.length > 0 && status.status !== 'generating' && (
        <section className="aiv-section">
          <h2>최종 영상</h2>
          {status.final_video_url
            ? <>
                <video src={status.final_video_url} controls style={{ width: '100%', maxWidth: 720, borderRadius: 12 }} />
                <br />
                <a className="aiv-btn-dl" href={status.final_video_url} download style={{ marginTop: 12, display:'inline-block' }}>
                  ⬇ 최종 영상 다운로드
                </a>
              </>
            : <button className="aiv-btn-primary" onClick={handleFinalize}>
                🎬 장면 영상 합치기 ({doneScenes.length}개)
              </button>}
        </section>
      )}
    </div>
  );
}

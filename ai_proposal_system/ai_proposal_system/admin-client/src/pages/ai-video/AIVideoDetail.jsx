import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProject, uploadCharSheet, generateProject, finalizeProject, deleteScene } from '../../api/aiVideo';
import AIVideoSceneForm from './AIVideoSceneForm';
import './aiv.css';

const STATUS_LABEL = { draft:'초안', generating:'생성 중', done:'완성', failed:'실패' };
const SCENE_STATUS = { pending:'⏳ 대기', generating:'⚙️ 생성 중', done:'✅ 완료', failed:'❌ 실패' };

export default function AIVideoDetail() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const [project, setProject] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editScene, setEditScene] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [charFile, setCharFile] = useState(null);

  const load = useCallback(async () => {
    try { const r = await getProject(id); setProject(r.data.data); }
    catch { navigate('/admin/ai-video'); }
    finally { setLoading(false); }
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  const handleCharUpload = async () => {
    if (!charFile) return;
    const fd = new FormData();
    fd.append('character_sheet', charFile);
    await uploadCharSheet(id, fd);
    setCharFile(null);
    load();
  };

  const handleGenerate = async () => {
    if (!window.confirm('장면 순서대로 영상 생성을 시작합니다. 계속할까요?')) return;
    await generateProject(id);
    navigate(`/admin/ai-video/${id}/monitor`);
  };

  const handleFinalize = async () => {
    if (!window.confirm('완성된 장면 영상들을 합쳐 최종 영상을 생성합니다.')) return;
    await finalizeProject(id);
    navigate(`/admin/ai-video/${id}/monitor`);
  };

  const handleDeleteScene = async (sceneId, order) => {
    if (!window.confirm(`장면 ${order}을 삭제할까요?`)) return;
    await deleteScene(sceneId);
    load();
  };

  if (loading) return <div className="aiv-page"><p>로딩 중...</p></div>;
  if (!project) return null;

  const scenes = project.scenes || [];
  const doneScenes = scenes.filter(s => s.status === 'done');

  return (
    <div className="aiv-page">
      <div className="aiv-header">
        <div>
          <h1>🎬 {project.title}</h1>
          <span className={`aiv-badge aiv-badge-${project.status}`}>{STATUS_LABEL[project.status]}</span>
          <span style={{ marginLeft: 12, color: '#888', fontSize: 14 }}>{project.description}</span>
        </div>
        <button className="aiv-btn-secondary" onClick={() => navigate('/admin/ai-video')}>← 목록</button>
      </div>

      {/* 캐릭터 시트 + 공통 스타일 요약 */}
      <section className="aiv-section">
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ marginBottom: 10 }}>캐릭터 시트</h2>
            {project.character_sheet_url
              ? <img src={project.character_sheet_url} alt="캐릭터 시트" className="aiv-char-img" />
              : <div className="aiv-no-char">없음 — 프로젝트 생성 시 업로드</div>}
          </div>
          {project.global_prompt && (
            <div style={{ flex: 1 }}>
              <h2 style={{ marginBottom: 10 }}>공통 스타일</h2>
              <div style={{ background: '#f8f9fa', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#555', lineHeight: 1.7 }}>
                {project.global_prompt}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 장면 목록 */}
      <section className="aiv-section">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <h2>장면 목록 ({scenes.length}/50)</h2>
          {scenes.length < 50 && (
            <button className="aiv-btn-primary" onClick={() => { setEditScene(null); setShowForm(true); }}>
              + 장면 추가
            </button>
          )}
        </div>

        {showForm && (
          <AIVideoSceneForm
            projectId={id}
            scene={editScene}
            nextOrder={scenes.length + 1}
            onSaved={() => { setShowForm(false); setEditScene(null); load(); }}
            onCancel={() => { setShowForm(false); setEditScene(null); }}
          />
        )}

        <div className="aiv-scene-list">
          {scenes.length === 0 && <p className="aiv-hint">장면이 없습니다. 장면을 추가해주세요.</p>}
          {scenes.map((s, i) => (
            <div key={s.id} className={`aiv-scene-row aiv-scene-${s.status}`}>
              <div className="aiv-scene-num">{s.scene_order}</div>
              <div className="aiv-scene-body">
                <div className="aiv-scene-scenario">{s.scenario}</div>
                <div className="aiv-scene-meta">
                  {s.duration_seconds}초
                  {s.clothing    && <span> · 의상: {s.clothing}</span>}
                  {s.background  && <span> · 배경: {s.background}</span>}
                  {s.direction   && <span> · 연출: {s.direction}</span>}
                </div>
                {s.error_message && <div className="aiv-scene-err">{s.error_message}</div>}
              </div>
              <div className="aiv-scene-status">{SCENE_STATUS[s.status] || s.status}</div>
              {s.video_url && (
                <video src={s.video_url} controls className="aiv-scene-video" />
              )}
              <div className="aiv-scene-actions">
                <button className="aiv-btn-sm" onClick={() => { setEditScene(s); setShowForm(true); }}>수정</button>
                <button className="aiv-btn-sm aiv-btn-del" onClick={() => handleDeleteScene(s.id, s.scene_order)}>삭제</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 액션 버튼 */}
      <section className="aiv-section">
        <div className="aiv-actions">
          {scenes.length > 0 && project.status !== 'generating' && (
            <button className="aiv-btn-primary" onClick={handleGenerate}>
              ▶ 영상 생성 시작
            </button>
          )}
          {doneScenes.length > 0 && (
            <button className="aiv-btn-outline" onClick={handleFinalize}>
              🎬 최종 영상 합치기
            </button>
          )}
          {project.final_video_url && (
            <a className="aiv-btn-dl" href={project.final_video_url} download>
              ⬇ 최종 영상 다운로드
            </a>
          )}
          <button className="aiv-btn-secondary" onClick={() => navigate(`/admin/ai-video/${id}/monitor`)}>
            📊 생성 상태 모니터링
          </button>
        </div>
      </section>
    </div>
  );
}

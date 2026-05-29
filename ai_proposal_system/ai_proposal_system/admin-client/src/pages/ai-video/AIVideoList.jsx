import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listProjects, deleteProject } from '../../api/aiVideo';
import './aiv.css';

const STATUS = {
  draft:      { label: '초안',    cls: 'draft' },
  generating: { label: '생성 중', cls: 'generating' },
  done:       { label: '완성',    cls: 'done' },
  failed:     { label: '실패',    cls: 'failed' },
};

export default function AIVideoList() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading,  setLoading]  = useState(true);

  const load = async () => {
    setLoading(true);
    try { const r = await listProjects(); setProjects(r.data.data?.rows || []); }
    catch (e) { alert(e.response?.data?.message || '목록 조회 실패'); }
    finally  { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id, title) => {
    if (!window.confirm(`"${title}" 프로젝트를 삭제하시겠습니까?`)) return;
    await deleteProject(id);
    load();
  };

  return (
    <div className="aiv-page">
      <div className="aiv-header">
        <div>
          <h1>🎬 AI 영상 제작 관리</h1>
          <p>fal.ai 기반 AI 영상 제작 프로젝트를 관리합니다.</p>
        </div>
        <button className="aiv-btn-primary" onClick={() => navigate('/admin/ai-video/create')}>
          + 새 프로젝트
        </button>
      </div>

      {loading ? <p className="aiv-info">로딩 중...</p> : (
        <div className="aiv-table-wrap">
          <table className="aiv-table">
            <thead>
              <tr>
                <th>ID</th><th>제목</th><th>캐릭터 시트</th><th>장면</th>
                <th>상태</th><th>생성일</th><th>관리</th>
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: '#aaa', padding: 32 }}>
                  프로젝트가 없습니다. 새 프로젝트를 만들어보세요!
                </td></tr>
              )}
              {projects.map(p => {
                const st = STATUS[p.status] || { label: p.status, cls: 'draft' };
                return (
                  <tr key={p.id}>
                    <td>{p.id}</td>
                    <td><strong>{p.title}</strong></td>
                    <td>
                      {p.character_sheet_url
                        ? <img src={p.character_sheet_url} alt="캐릭터 시트" className="aiv-thumb" />
                        : <span className="aiv-no-img">없음</span>}
                    </td>
                    <td>
                      <span className="aiv-scene-cnt">{p.completed_scenes || 0} / {p.scene_count || 0}</span>
                    </td>
                    <td><span className={`aiv-badge aiv-badge-${st.cls}`}>{st.label}</span></td>
                    <td>{new Date(p.created_at).toLocaleDateString('ko-KR')}</td>
                    <td>
                      <Link to={`/admin/ai-video/${p.id}`} className="aiv-btn-sm">상세</Link>
                      {p.status === 'done' && p.final_video_url && (
                        <a href={p.final_video_url} download className="aiv-btn-sm aiv-btn-dl">⬇ 다운로드</a>
                      )}
                      <button className="aiv-btn-sm aiv-btn-del" onClick={() => handleDelete(p.id, p.title)}>삭제</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

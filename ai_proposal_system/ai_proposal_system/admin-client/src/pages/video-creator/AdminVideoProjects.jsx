import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminGetProjects, adminStartRender, adminGetJobs } from '../../api/videoCreator';
import './vc.css';

const STATUS_LABEL = {
  draft:         '📝 초안',
  ai_generating: '⏳ AI 생성 중',
  ai_done:       '✅ AI 완료',
  render_queued: '⏳ 렌더 대기',
  rendering:     '⚙️ 렌더링 중',
  done:          '🎉 완성',
  failed:        '❌ 실패',
};

export default function AdminVideoProjects() {
  const [projects, setProjects] = useState([]);
  const [jobs, setJobs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('projects');

  useEffect(() => {
    Promise.all([
      adminGetProjects().then(r => setProjects(r.data.data?.rows || [])),
      adminGetJobs().then(r => setJobs(r.data.data || [])),
    ]).finally(() => setLoading(false));
  }, []);

  const handleRender = async (id) => {
    if (!window.confirm('렌더링을 시작하시겠습니까?')) return;
    try {
      await adminStartRender(id);
      alert('렌더링이 시작되었습니다.');
      const r = await adminGetProjects();
      setProjects(r.data.data?.rows || []);
    } catch (e) {
      alert(e.response?.data?.message || '렌더링 시작 실패');
    }
  };

  if (loading) return <div className="vc-page"><p>로딩 중...</p></div>;

  return (
    <div className="vc-page">
      <div className="vc-header">
        <h1>🎬 영상 제작 관리</h1>
        <div className="vc-tabs">
          <button className={tab === 'projects' ? 'active' : ''} onClick={() => setTab('projects')}>
            프로젝트 목록
          </button>
          <button className={tab === 'jobs' ? 'active' : ''} onClick={() => setTab('jobs')}>
            렌더링 작업
          </button>
        </div>
      </div>

      {tab === 'projects' && (
        <div className="vc-table-wrap">
          <table className="vc-table">
            <thead>
              <tr><th>ID</th><th>제목</th><th>이벤트</th><th>스타일</th><th>상태</th><th>생성일</th><th>액션</th></tr>
            </thead>
            <tbody>
              {projects.map(p => (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td>{p.title || '(미지정)'}</td>
                  <td>{p.event_type}</td>
                  <td>{p.style}</td>
                  <td><span className="vc-badge">{STATUS_LABEL[p.status] || p.status}</span></td>
                  <td>{new Date(p.created_at).toLocaleDateString('ko-KR')}</td>
                  <td>
                    <Link to={`/admin/video-projects/${p.id}`} className="vc-btn-sm">상세</Link>
                    {p.status === 'ai_done' && (
                      <button className="vc-btn-sm vc-btn-render" onClick={() => handleRender(p.id)}>
                        ▶ 렌더링 시작
                      </button>
                    )}
                    {p.status === 'done' && p.output_video_url && (
                      <a href={p.output_video_url} download className="vc-btn-sm vc-btn-dl">⬇ 다운로드</a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'jobs' && (
        <div className="vc-table-wrap">
          <table className="vc-table">
            <thead>
              <tr><th>작업ID</th><th>프로젝트</th><th>상태</th><th>진행</th><th>시작</th><th>완료</th></tr>
            </thead>
            <tbody>
              {jobs.map(j => (
                <tr key={j.id}>
                  <td>{j.id}</td>
                  <td>{j.title || j.project_id}</td>
                  <td>{STATUS_LABEL[j.status] || j.status}</td>
                  <td>
                    <div className="vc-progress">
                      <div className="vc-progress-bar" style={{ width: `${j.progress}%` }} />
                      <span>{j.progress}%</span>
                    </div>
                  </td>
                  <td>{j.started_at ? new Date(j.started_at).toLocaleTimeString('ko-KR') : '-'}</td>
                  <td>{j.completed_at ? new Date(j.completed_at).toLocaleTimeString('ko-KR') : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { listProjects } from '../../api/musicVideo';
import './mv.css';

const STEP_LABEL = {
  upload: '📁 업로드', transcribing: '⏳ 가사추출중', lyrics_review: '✏️ 가사확인',
  breaking_down: '⏳ 장면분리중', scene_review: '🎬 장면확인', generating_images: '⏳ 이미지생성중',
  image_review: '🖼️ 이미지검토', generating_videos: '⏳ 영상생성중',
  merging: '⏳ 합치는중', done: '✅ 완료', failed: '❌ 실패',
};

export default function MVProjectList() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    listProjects().then(r => setProjects(r.data.data?.rows || [])).finally(() => setLoading(false));
  }, []);

  return (
    <div className="mv-page">
      <div className="mv-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <h1>🎵 뮤직비디오 제작</h1>
          <p>음악 파일과 캐릭터 시트를 업로드하면 AI가 자동으로 뮤직비디오를 만들어드립니다.</p>
        </div>
        <button className="mv-btn-primary" onClick={() => navigate('/admin/music-video/create')}>
          + 새 프로젝트
        </button>
      </div>

      {loading ? <p className="mv-info">로딩 중...</p> : (
        <div className="mv-table-wrap">
          <table className="mv-table">
            <thead>
              <tr><th>제목</th><th>단계</th><th>장면</th><th>이미지</th><th>생성일</th><th>관리</th></tr>
            </thead>
            <tbody>
              {projects.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign:'center', color:'#aaa', padding:40 }}>
                  프로젝트가 없습니다. 첫 번째 뮤직비디오를 만들어보세요! 🎵
                </td></tr>
              )}
              {projects.map(p => (
                <tr key={p.id}>
                  <td><strong>{p.title}</strong></td>
                  <td><span className={`mv-status-badge mv-status-${p.step === 'done' ? 'done' : p.step === 'failed' ? 'failed' : 'generating'}`}>{STEP_LABEL[p.step] || p.step}</span></td>
                  <td>{p.scene_count || 0}개</td>
                  <td>{p.images_done || 0}장 완료</td>
                  <td>{new Date(p.created_at).toLocaleDateString('ko-KR')}</td>
                  <td>
                    <Link to={`/admin/music-video/${p.id}`} className="mv-btn-sm">관리</Link>
                    {p.step === 'done' && p.final_video_url && (
                      <a href={p.final_video_url} download className="mv-btn-sm mv-btn-regen" style={{ marginLeft: 4 }}>⬇ 다운로드</a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createProject } from '../../api/musicVideo';
import './mv.css';

const STYLES = [
  { label: '3D 애니메이션', value: '3D animation style, Pixar-inspired, vibrant colors, smooth rendering, cinematic quality' },
  { label: '애니/웹툰',     value: 'anime illustration style, webtoon art, soft cel shading, clean line art, Korean manhwa' },
  { label: '실사 영화',     value: 'photorealistic, cinematic film style, 4K quality, dramatic lighting, movie-like atmosphere' },
  { label: '로맨틱 감성',   value: 'romantic and emotional, soft warm lighting, dreamy bokeh, pastel color palette' },
];

export default function MVProjectCreate() {
  const navigate = useNavigate();
  const [title,     setTitle]     = useState('');
  const [style,     setStyle]     = useState(STYLES[0].value);
  const [charDesc,  setCharDesc]  = useState('');
  const [musicFile, setMusicFile] = useState(null);
  const [charFile,  setCharFile]  = useState(null);
  const [charPreview, setCharPreview] = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  const handleChar = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setCharFile(f);
    setCharPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) { setError('제목을 입력하세요.'); return; }
    if (!musicFile)    { setError('음악 파일을 업로드하세요.'); return; }
    if (!charFile)     { setError('캐릭터 시트를 업로드하세요.'); return; }
    setLoading(true); setError('');
    try {
      const fd = new FormData();
      fd.append('title',           title);
      fd.append('global_style',    style);
      fd.append('character_desc',  charDesc);
      fd.append('music',           musicFile);
      fd.append('character_sheet', charFile);
      const res = await createProject(fd);
      navigate(`/admin/music-video/${res.data.data.id}`);
    } catch (e) {
      setError(e.response?.data?.message || '생성 실패');
    } finally { setLoading(false); }
  };

  return (
    <div className="mv-page">
      <div className="mv-header">
        <h1>🎵 새 뮤직비디오 프로젝트</h1>
        <p>음악 파일과 캐릭터 시트를 업로드하면 AI가 자동으로 분석합니다.</p>
      </div>

      <form onSubmit={handleSubmit} style={{ maxWidth: 800 }}>

        {/* 기본 정보 */}
        <div className="mv-field">
          <label>프로젝트 제목 *</label>
          <input className="mv-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="예: 지호 프로포즈 뮤직비디오" />
        </div>

        {/* 영상 스타일 */}
        <div className="mv-field">
          <label>영상 스타일</label>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:10 }}>
            {STYLES.map(s => (
              <button key={s.label} type="button"
                onClick={() => setStyle(s.value)}
                style={{ padding:'6px 16px', borderRadius:20, border:'1px solid #ddd', cursor:'pointer', fontSize:13,
                  background: style === s.value ? '#e91e63' : '#fff',
                  color: style === s.value ? '#fff' : '#555' }}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mv-field">
          <label>캐릭터 설명 <span style={{ color:'#999', fontWeight:400 }}>(영어로 입력 시 효과적)</span></label>
          <input className="mv-input" value={charDesc} onChange={e => setCharDesc(e.target.value)}
            placeholder="예: cute 3D animated girl with black hair, purple dress, big eyes" />
        </div>

        {/* 파일 업로드 2개 나란히 */}
        <div style={{ display:'flex', gap:24, marginBottom:24 }}>

          {/* 음악 파일 */}
          <div style={{ flex:1 }}>
            <label style={{ fontWeight:700, fontSize:14, display:'block', marginBottom:8 }}>
              🎵 음악 파일 * <span style={{ color:'#999', fontWeight:400, fontSize:12 }}>mp3, wav (Suno에서 다운로드)</span>
            </label>
            <label className={`mv-upload-zone ${musicFile ? 'has-file' : ''}`} style={{ minHeight:120 }}>
              <input type="file" accept="audio/*,.mp3,.wav,.m4a" hidden onChange={e => setMusicFile(e.target.files[0])} />
              {musicFile
                ? <div className="mv-upload-done">✅ {musicFile.name}</div>
                : <><span>📁 클릭하여 음악 파일 선택</span><small>mp3, wav, m4a</small></>}
            </label>
          </div>

          {/* 캐릭터 시트 */}
          <div style={{ flex:1 }}>
            <label style={{ fontWeight:700, fontSize:14, display:'block', marginBottom:8 }}>
              🖼️ 캐릭터 시트 * <span style={{ color:'#999', fontWeight:400, fontSize:12 }}>플로우에서 다운로드</span>
            </label>
            <label className={`mv-upload-zone ${charFile ? 'has-file' : ''}`} style={{ minHeight:120 }}>
              <input type="file" accept="image/*" hidden onChange={handleChar} />
              {charPreview
                ? <img src={charPreview} alt="캐릭터" style={{ maxHeight:100, borderRadius:8 }} />
                : <><span>📷 클릭하여 캐릭터 시트 선택</span><small>jpg, png, webp</small></>}
            </label>
          </div>
        </div>

        {error && <p className="mv-error">{error}</p>}

        <div className="mv-actions">
          <button type="button" className="mv-btn-secondary" onClick={() => navigate('/admin/music-video')}>취소</button>
          <button type="submit" className="mv-btn-primary" disabled={loading}>
            {loading ? '업로드 중...' : '업로드 완료 → 가사 자동 추출 시작'}
          </button>
        </div>
      </form>
    </div>
  );
}

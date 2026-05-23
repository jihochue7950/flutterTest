import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMusicLibrary, selectLibraryMusic, uploadCustomMusic, getProjectMusic } from '../../api/videoCreator';
import './vc.css';

const MOOD_LABELS = {
  romantic: '🌹 로맨틱', upbeat: '⚡ 경쾌', emotional: '😢 감동',
  classical: '🎻 클래식', cheerful: '☀️ 밝음', cinematic: '🎬 시네마틱',
};

export default function MusicSelectPage() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const [library, setLibrary]   = useState([]);
  const [current, setCurrent]   = useState(null);
  const [selected, setSelected] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    getMusicLibrary().then(r => setLibrary(r.data.data || []));
    getProjectMusic(id).then(r => {
      const m = r.data.data;
      if (m) { setCurrent(m); setSelected(m.music_library_id); }
    }).catch(() => {});
  }, [id]);

  const handleSelect = async (mlId) => {
    setSelected(mlId);
    await selectLibraryMusic(id, mlId);
    setCurrent({ music_library_id: mlId });
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('music', file);
      const res = await uploadCustomMusic(id, fd);
      setCurrent({ custom_url: res.data.data.custom_url, filename: file.name });
      setSelected(null);
    } catch (e) {
      setError('음악 업로드 실패');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="vc-page">
      <div className="vc-header">
        <h1>🎵 음악 선택</h1>
        <p>기본 제공 음악을 선택하거나 직접 업로드하세요.</p>
      </div>

      {current && (
        <div className="vc-info-box">
          ✅ 선택된 음악: {current.title || current.filename || '직접 업로드'}
        </div>
      )}

      <section className="vc-section">
        <h2>기본 제공 음악</h2>
        <div className="vc-music-list">
          {library.map(m => (
            <div
              key={m.id}
              className={`vc-music-item ${selected === m.id ? 'selected' : ''}`}
              onClick={() => handleSelect(m.id)}
            >
              <div className="vc-music-mood">{MOOD_LABELS[m.mood] || m.mood}</div>
              <div className="vc-music-title">{m.title}</div>
              <div className="vc-music-artist">{m.artist} · {m.duration_sec}초</div>
            </div>
          ))}
        </div>
      </section>

      <section className="vc-section">
        <h2>직접 업로드 <span className="vc-optional">(mp3, wav)</span></h2>
        <label className="vc-upload-zone">
          <input type="file" accept="audio/mpeg,audio/wav,.mp3,.wav" onChange={handleUpload} hidden />
          <span>🎵 음악 파일 선택</span>
        </label>
        {uploading && <p className="vc-info">업로드 중...</p>}
        {error    && <p className="vc-error">{error}</p>}
      </section>

      <div className="vc-actions">
        <button className="vc-btn-secondary" onClick={() => navigate(`/video-creator/${id}/photos`)}>← 이전</button>
        <button className="vc-btn-primary" onClick={() => navigate(`/video-creator/${id}/scenario`)}>
          시나리오 입력으로 이동 →
        </button>
      </div>
    </div>
  );
}

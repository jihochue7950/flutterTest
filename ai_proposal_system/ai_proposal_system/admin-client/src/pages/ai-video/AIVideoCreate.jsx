import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createProject } from '../../api/aiVideo';
import './aiv.css';

const FAL_MODELS = [
  { value: 'fal-ai/kling-video/v1/pro',                    label: 'Kling V1 Pro — 균형 (추천)' },
  { value: 'fal-ai/kling-video/o1/reference-to-video',     label: 'Kling O1 Reference — 캐릭터 일관성 최강' },
  { value: 'fal-ai/kling-video/v3/pro',                    label: 'Kling V3 Pro — 최고 품질' },
  { value: 'fal-ai/wan',                                   label: 'WAN — 저렴한 대안' },
];

export default function AIVideoCreate() {
  const navigate = useNavigate();
  const [form,    setForm]    = useState({ title: '', description: '', fal_model: 'fal-ai/kling-video/v1/pro' });
  const [file,    setFile]    = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('제목을 입력하세요.'); return; }
    setLoading(true); setError('');
    try {
      const fd = new FormData();
      fd.append('title',       form.title);
      fd.append('description', form.description);
      fd.append('fal_model',   form.fal_model);
      if (file) fd.append('character_sheet', file);

      const res = await createProject(fd);
      navigate(`/admin/ai-video/${res.data.data.id}`);
    } catch (e) {
      setError(e.response?.data?.message || '생성 실패');
    } finally { setLoading(false); }
  };

  return (
    <div className="aiv-page">
      <div className="aiv-header">
        <h1>🎬 새 AI 영상 프로젝트</h1>
        <p>캐릭터 시트와 기본 정보를 입력한 후 장면을 추가합니다.</p>
      </div>

      <form onSubmit={handleSubmit} className="aiv-form">
        <div className="aiv-field">
          <label>프로젝트 제목 *</label>
          <input className="aiv-input" value={form.title} onChange={set('title')} placeholder="예: 지호 프로포즈 영상" required />
        </div>

        <div className="aiv-field">
          <label>전체 영상 설명</label>
          <textarea className="aiv-textarea" value={form.description} onChange={set('description')}
            placeholder="전체 영상의 콘셉트나 설명을 입력하세요." rows={3} />
        </div>

        <div className="aiv-field">
          <label>AI 모델 선택</label>
          <select className="aiv-select" value={form.fal_model} onChange={set('fal_model')}>
            {FAL_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <small className="aiv-hint">FAL_KEY 없으면 어떤 모델이든 Mock 모드로 동작합니다.</small>
        </div>

        <div className="aiv-field">
          <label>캐릭터 시트 업로드 <span className="aiv-optional">(나중에도 업로드 가능)</span></label>
          <label className="aiv-upload-zone">
            <input type="file" accept="image/*" onChange={handleFile} hidden />
            {preview
              ? <img src={preview} alt="미리보기" style={{ maxHeight: 200, borderRadius: 8 }} />
              : <><span>📷 이미지 클릭하여 선택</span><small>jpg, png, webp — 모든 장면의 캐릭터 레퍼런스로 사용</small></>}
          </label>
        </div>

        {error && <p className="aiv-error">{error}</p>}

        <div className="aiv-actions">
          <button type="button" className="aiv-btn-secondary" onClick={() => navigate('/admin/ai-video')}>취소</button>
          <button type="submit" className="aiv-btn-primary" disabled={loading}>
            {loading ? '생성 중...' : '프로젝트 생성 →'}
          </button>
        </div>
      </form>
    </div>
  );
}

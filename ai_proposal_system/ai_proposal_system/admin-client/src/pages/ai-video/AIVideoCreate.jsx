import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createProject } from '../../api/aiVideo';
import './aiv.css';

const FAL_MODELS = [
  { value: 'fal-ai/kling-video/o1/reference-to-video', label: '⭐ Kling O1 Reference — 캐릭터 일관성 최강 (추천)' },
  { value: 'fal-ai/kling-video/v1.6/pro',              label: 'Kling V1.6 Pro — 균형' },
  { value: 'fal-ai/kling-video/v3/pro',                label: 'Kling V3 Pro — 최고 품질' },
  { value: 'fal-ai/wan',                               label: 'WAN — 저렴한 대안' },
];

const STYLE_PRESETS = [
  { label: '3D 애니메이션', value: '3D animation style, Pixar-inspired, vibrant colors, smooth rendering, cinematic quality' },
  { label: '실사 영화',     value: 'photorealistic, cinematic film style, 4K quality, dramatic lighting, movie-like atmosphere' },
  { label: '로맨틱 감성',   value: 'romantic and emotional atmosphere, soft warm lighting, dreamy bokeh, pastel color palette' },
  { label: '웨딩/프로포즈', value: 'elegant wedding aesthetic, soft white tones, rose petals, golden hour lighting, emotional and heartfelt' },
  { label: '생일 축하',     value: 'cheerful and warm birthday celebration, bright colors, festive atmosphere, joyful mood' },
  { label: '가족 감사',     value: 'warm family atmosphere, nostalgic and heartfelt, soft natural lighting, emotional and sincere' },
];

export default function AIVideoCreate() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    description: '',
    fal_model: 'fal-ai/kling-video/o1/reference-to-video',
    global_prompt: '',
    character_description: '',
  });
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

  const applyPreset = (value) => setForm(f => ({ ...f, global_prompt: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('제목을 입력하세요.'); return; }
    setLoading(true); setError('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => v && fd.append(k, v));
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
        <p>기본 정보와 공통 스타일을 설정하면, 모든 장면에 자동으로 적용됩니다.</p>
      </div>

      <form onSubmit={handleSubmit} className="aiv-form" style={{ maxWidth: 800 }}>

        {/* ── 기본 정보 ─────────────────────────────────────── */}
        <div className="aiv-section-title">📋 기본 정보</div>

        <div className="aiv-field">
          <label>프로젝트 제목 *</label>
          <input className="aiv-input" value={form.title} onChange={set('title')}
            placeholder="예: 지호 프로포즈 영상" required />
        </div>

        <div className="aiv-field">
          <label>AI 모델</label>
          <select className="aiv-select" value={form.fal_model} onChange={set('fal_model')}>
            {FAL_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <small className="aiv-hint">
            O1 Reference는 캐릭터 시트 이미지를 기반으로 전 장면에서 동일한 캐릭터를 유지합니다.
          </small>
        </div>

        {/* ── 캐릭터 시트 ───────────────────────────────────── */}
        <div className="aiv-section-title" style={{ marginTop: 28 }}>
          🖼️ 캐릭터 시트
          <span className="aiv-optional" style={{ marginLeft: 8 }}>모든 장면의 캐릭터 레퍼런스</span>
        </div>

        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          <label className="aiv-upload-zone" style={{ flex: '0 0 200px', minHeight: 160 }}>
            <input type="file" accept="image/*" onChange={handleFile} hidden />
            {preview
              ? <img src={preview} alt="캐릭터 시트" style={{ maxHeight: 180, borderRadius: 8 }} />
              : <>
                  <span>📷 클릭하여 업로드</span>
                  <small>jpg, png, webp</small>
                </>}
          </label>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, color: '#555', lineHeight: 1.7, marginBottom: 12 }}>
              <strong>캐릭터 시트란?</strong><br />
              영상에 등장하는 주인공의 외모(얼굴, 의상, 체형)를 여러 각도에서 보여주는 참고 이미지입니다.<br />
              <br />
              <strong>좋은 캐릭터 시트 예시:</strong><br />
              • 3D 캐릭터의 정면/측면/후면 뷰<br />
              • 실사 인물 사진 (정면 얼굴이 잘 보이는 것)<br />
              • AI로 생성한 캐릭터 일러스트
            </p>
            <div className="aiv-field" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: 13 }}>캐릭터 설명 <span className="aiv-optional">(영어로 입력 시 효과적)</span></label>
              <input className="aiv-input" value={form.character_description}
                onChange={set('character_description')}
                placeholder="예: cute 3D girl with black hair, purple dress, big eyes" />
            </div>
          </div>
        </div>

        {/* ── 공통 스타일 설정 ──────────────────────────────── */}
        <div className="aiv-section-title" style={{ marginTop: 28 }}>
          🎨 공통 스타일 설정
          <span className="aiv-optional" style={{ marginLeft: 8 }}>모든 장면에 동일하게 적용됨</span>
        </div>

        <div className="aiv-field">
          <label>스타일 프리셋</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            {STYLE_PRESETS.map(p => (
              <button key={p.label} type="button"
                onClick={() => applyPreset(p.value)}
                style={{
                  padding: '6px 14px', borderRadius: 20, border: '1px solid #ddd',
                  background: form.global_prompt === p.value ? '#e91e63' : '#fff',
                  color: form.global_prompt === p.value ? '#fff' : '#555',
                  cursor: 'pointer', fontSize: 13,
                }}>
                {p.label}
              </button>
            ))}
          </div>
          <textarea className="aiv-textarea" rows={3} value={form.global_prompt}
            onChange={set('global_prompt')}
            placeholder={`모든 장면에 공통으로 적용할 스타일을 영어로 입력하세요.\n예: 3D animation style, Pixar-inspired, vibrant colors, cinematic quality`} />
          <small className="aiv-hint">
            여기 입력한 내용이 모든 장면 프롬프트 앞에 자동으로 추가됩니다.
          </small>
        </div>

        {error && <p className="aiv-error">{error}</p>}

        <div className="aiv-actions">
          <button type="button" className="aiv-btn-secondary" onClick={() => navigate('/admin/ai-video')}>취소</button>
          <button type="submit" className="aiv-btn-primary" disabled={loading}>
            {loading ? '생성 중...' : '다음: 장면 입력 →'}
          </button>
        </div>
      </form>
    </div>
  );
}

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createProject } from '../../api/videoCreator';
import './vc.css';

const EVENT_TYPES = [
  { value: 'proposal',    label: '💍 프로포즈',         desc: '세상에 단 하나뿐인 프로포즈' },
  { value: 'birthday',    label: '🎂 생일 이벤트',       desc: '잊지 못할 생일 서프라이즈' },
  { value: 'anniversary', label: '🎉 기념일',            desc: '소중한 기념일을 영상으로' },
  { value: 'parents',     label: '🌹 부모님 감사 영상',   desc: '말로 못했던 감사함을 전달' },
  { value: 'teacher',     label: '🏫 스승의 날',          desc: '선생님께 드리는 특별한 선물' },
  { value: 'other',       label: '✨ 기타 감성 이벤트',  desc: '특별한 순간을 영상으로' },
];

const STYLES = [
  { value: 'emotional', label: '감동적인 스타일',       emoji: '😢' },
  { value: 'luxury',    label: '고급스러운 스타일',     emoji: '💎' },
  { value: 'cinematic', label: '영화 같은 스타일',      emoji: '🎬' },
  { value: 'bright',    label: '밝고 따뜻한 스타일',    emoji: '☀️' },
  { value: 'parents',   label: '부모님 감사 스타일',    emoji: '🌹' },
  { value: 'proposal',  label: '프로포즈 스타일',       emoji: '💍' },
];

export default function VideoCreatorWizard() {
  const navigate = useNavigate();
  const [eventType, setEventType] = useState('');
  const [style, setStyle]         = useState('');
  const [title, setTitle]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  const handleStart = async () => {
    if (!eventType || !style) { setError('이벤트 종류와 스타일을 선택해주세요.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await createProject({ event_type: eventType, style, title: title || undefined });
      navigate(`/video-creator/${res.data.data.id}/photos`);
    } catch (e) {
      setError(e.response?.data?.message || '프로젝트 생성 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="vc-page">
      <div className="vc-header">
        <h1>🎬 AI 영상 제작 시작</h1>
        <p>사진과 음악을 업로드하면 AI가 자동으로 감동적인 영상을 만들어드립니다.</p>
      </div>

      {/* Step 1: 이벤트 종류 */}
      <section className="vc-section">
        <h2>1단계 — 이벤트 종류 선택</h2>
        <div className="vc-grid">
          {EVENT_TYPES.map(et => (
            <div
              key={et.value}
              className={`vc-card ${eventType === et.value ? 'selected' : ''}`}
              onClick={() => setEventType(et.value)}
            >
              <div className="vc-card-label">{et.label}</div>
              <div className="vc-card-desc">{et.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Step 2: 스타일 */}
      <section className="vc-section">
        <h2>2단계 — 영상 스타일 선택</h2>
        <div className="vc-grid vc-grid-3">
          {STYLES.map(s => (
            <div
              key={s.value}
              className={`vc-card ${style === s.value ? 'selected' : ''}`}
              onClick={() => setStyle(s.value)}
            >
              <span className="vc-emoji">{s.emoji}</span>
              <div className="vc-card-label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 영상 제목 (선택) */}
      <section className="vc-section">
        <h2>영상 제목 <span className="vc-optional">(선택)</span></h2>
        <input
          className="vc-input"
          placeholder="예: 우리의 특별한 순간"
          value={title}
          onChange={e => setTitle(e.target.value)}
          maxLength={100}
        />
      </section>

      {error && <p className="vc-error">{error}</p>}

      <div className="vc-actions">
        <button className="vc-btn-primary" onClick={handleStart} disabled={loading}>
          {loading ? '생성 중...' : '사진 업로드로 이동 →'}
        </button>
      </div>
    </div>
  );
}

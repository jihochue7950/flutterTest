import React, { useState, useEffect } from 'react';
import { addScene, updateScene } from '../../api/aiVideo';
import './aiv.css';

const SAME_CLOTHES = 'same clothes as previous scene';
const SAME_BG      = 'same background as previous scene';

export default function AIVideoSceneForm({ projectId, scene, nextOrder, onSaved, onCancel }) {
  const isEdit = !!scene;
  const [form, setForm] = useState({
    scene_order:      '',
    scenario:         '',
    duration_seconds: 5,
    clothing:         '',
    background:       '',
    direction:        '',
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [sameClothes, setSameClothes] = useState(false);
  const [sameBg,      setSameBg]      = useState(false);

  useEffect(() => {
    if (scene) {
      setForm({
        scene_order:      scene.scene_order,
        scenario:         scene.scenario || '',
        duration_seconds: scene.duration_seconds || 5,
        clothing:         scene.clothing === SAME_CLOTHES ? '' : (scene.clothing || ''),
        background:       scene.background === SAME_BG ? '' : (scene.background || ''),
        direction:        scene.direction || '',
      });
      setSameClothes(scene.clothing === SAME_CLOTHES);
      setSameBg(scene.background === SAME_BG);
    } else {
      setForm(f => ({ ...f, scene_order: nextOrder }));
    }
  }, [scene, nextOrder]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.scenario.trim()) { setError('장면 시나리오는 필수입니다.'); return; }
    setLoading(true); setError('');
    try {
      const payload = {
        ...form,
        clothing:   sameClothes ? SAME_CLOTHES : form.clothing,
        background: sameBg      ? SAME_BG      : form.background,
      };
      if (isEdit) await updateScene(scene.id, payload);
      else        await addScene(projectId, payload);
      onSaved();
    } catch (e) {
      setError(e.response?.data?.message || '저장 실패');
    } finally { setLoading(false); }
  };

  return (
    <div className="aiv-scene-form">
      <h3>{isEdit ? `장면 ${scene.scene_order} 수정` : '새 장면 추가'}</h3>
      <form onSubmit={handleSubmit}>
        <div className="aiv-form-row">
          <div className="aiv-field" style={{ flex: '0 0 120px' }}>
            <label>장면 번호</label>
            <input className="aiv-input" type="number" min={1} max={50} value={form.scene_order} onChange={set('scene_order')} />
          </div>
          <div className="aiv-field" style={{ flex: '0 0 120px' }}>
            <label>영상 길이 (초)</label>
            <input className="aiv-input" type="number" min={1} max={20} value={form.duration_seconds} onChange={set('duration_seconds')} />
          </div>
        </div>

        <div className="aiv-field">
          <label>장면 시나리오 *</label>
          <textarea className="aiv-textarea" rows={3} value={form.scenario} onChange={set('scenario')}
            placeholder="예: A woman walks into a coffee shop and orders a latte." />
          <small className="aiv-hint">영어로 작성하면 fal.ai 프롬프트 정확도가 높아집니다.</small>
        </div>

        <div className="aiv-form-row">
          <div className="aiv-field">
            <label>의상 (Clothing)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <input type="checkbox" id="sameClothes" checked={sameClothes} onChange={e => setSameClothes(e.target.checked)} />
              <label htmlFor="sameClothes" style={{ fontSize: 13, color: '#555', cursor: 'pointer' }}>
                이전 장면과 동일한 의상
              </label>
            </div>
            <input className="aiv-input" value={sameClothes ? SAME_CLOTHES : form.clothing}
              disabled={sameClothes} onChange={set('clothing')}
              placeholder="예: gray coat, white blouse" />
          </div>

          <div className="aiv-field">
            <label>배경 (Background)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <input type="checkbox" id="sameBg" checked={sameBg} onChange={e => setSameBg(e.target.checked)} />
              <label htmlFor="sameBg" style={{ fontSize: 13, color: '#555', cursor: 'pointer' }}>
                이전 장면과 동일한 배경
              </label>
            </div>
            <input className="aiv-input" value={sameBg ? SAME_BG : form.background}
              disabled={sameBg} onChange={set('background')}
              placeholder="예: midwinter coffee shop, park in autumn" />
          </div>
        </div>

        <div className="aiv-field">
          <label>추가 연출 (Direction)</label>
          <input className="aiv-input" value={form.direction} onChange={set('direction')}
            placeholder="예: smooth cinematic tracking shot, close-up, warm lighting" />
        </div>

        {error && <p className="aiv-error">{error}</p>}

        <div className="aiv-actions" style={{ marginTop: 16 }}>
          <button type="button" className="aiv-btn-secondary" onClick={onCancel}>취소</button>
          <button type="submit" className="aiv-btn-primary" disabled={loading}>
            {loading ? '저장 중...' : (isEdit ? '수정 완료' : '장면 추가')}
          </button>
        </div>
      </form>
    </div>
  );
}

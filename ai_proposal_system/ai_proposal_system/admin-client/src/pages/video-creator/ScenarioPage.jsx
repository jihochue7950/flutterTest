import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { saveScenario } from '../../api/videoCreator';
import './vc.css';

export default function ScenarioPage() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const [scenario, setScenario] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleSaveManual = async () => {
    setLoading(true);
    setError('');
    try {
      await saveScenario(id, { user_scenario: scenario, generate_ai: false });
      navigate(`/video-creator/${id}/preview`);
    } catch (e) {
      setError('저장 실패');
    } finally { setLoading(false); }
  };

  const handleGenerateAI = async () => {
    setLoading(true);
    setError('');
    try {
      await saveScenario(id, { user_scenario: scenario, generate_ai: true });
      navigate(`/video-creator/${id}/preview`);
    } catch (e) {
      setError(e.response?.data?.message || 'AI 시나리오 생성 실패');
    } finally { setLoading(false); }
  };

  return (
    <div className="vc-page">
      <div className="vc-header">
        <h1>📝 시나리오 입력</h1>
        <p>스토리를 직접 작성하거나 AI에게 자동 생성을 요청하세요.</p>
      </div>

      <section className="vc-section">
        <h2>메모 <span className="vc-optional">(AI 참고용 — 선택)</span></h2>
        <textarea
          className="vc-textarea"
          placeholder={`예시:\n- 우리가 처음 만난 날: 2022년 3월\n- 함께 간 여행: 제주도\n- 좋아하는 것: 커피, 산책\n- 전하고 싶은 말: 항상 고마워, 사랑해`}
          value={scenario}
          onChange={e => setScenario(e.target.value)}
          rows={8}
        />
      </section>

      {error && <p className="vc-error">{error}</p>}
      {loading && <p className="vc-info">⏳ AI가 시나리오를 생성하고 있습니다... (약 10~20초)</p>}

      <div className="vc-actions">
        <button className="vc-btn-secondary" onClick={() => navigate(`/video-creator/${id}/music`)}>← 이전</button>
        <button className="vc-btn-outline" onClick={handleSaveManual} disabled={loading}>
          직접 작성 완료 →
        </button>
        <button className="vc-btn-primary" onClick={handleGenerateAI} disabled={loading}>
          ✨ AI 자동 시나리오 생성 →
        </button>
      </div>
    </div>
  );
}

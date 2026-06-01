import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getProject, getStatus, transcribeLyrics, saveLyrics,
  breakdownScenes, updateScene, updatePrompt,
  generateImages, regenerateImage, generateVideos, mergeProject,
} from '../../api/musicVideo';
import { addCharSheet, deleteCharSheet } from '../../api/musicVideoChar';
import './mv.css';

const STEPS = ['업로드', '가사 확인', '장면 구성', '이미지 검토', '최종 영상'];
const STEP_MAP = {
  upload:1, transcribing:2, lyrics_review:2, breaking_down:3, scene_review:3,
  generating_images:4, image_review:4, generating_videos:4, merging:5, done:5, failed:5,
};

function StepBar({ step }) {
  const cur = STEP_MAP[step] || 1;
  return (
    <div className="mv-steps">
      {STEPS.map((s, i) => (
        <div key={s} className={`mv-step ${cur === i+1 ? 'active' : cur > i+1 ? 'done' : ''}`}>
          {cur > i+1 ? '✓ ' : ''}{s}
        </div>
      ))}
    </div>
  );
}

export default function MVProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [status,  setStatus]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg,     setMsg]     = useState('');
  const [charName, setCharName] = useState('');
  const [charFile, setCharFile] = useState(null);
  const [editLyrics, setEditLyrics] = useState('');
  const pollRef = useRef(null);
  const prevStepRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const [pRes, sRes] = await Promise.all([getProject(id), getStatus(id)]);
      setProject(pRes.data.data);
      setStatus(sRes.data.data);
      if (!editLyrics && pRes.data.data.lyrics_edited) setEditLyrics(pRes.data.data.lyrics_edited);
    } catch (_) {}
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 4000);
    return () => clearInterval(pollRef.current);
  }, [load]);

  // 진행 중 상태가 아니면 폴링 중단
  useEffect(() => {
    const busy = ['transcribing','breaking_down','generating_images','generating_videos','merging'];
    if (status && !busy.includes(status.step)) {
      clearInterval(pollRef.current);
    }
  }, [status?.step]);


  // 단계 변경 감지 → 자동 알림 + 스크롤
  useEffect(() => {
    const busy = ["transcribing","breaking_down","generating_images","generating_videos","merging"];
    if (prevStepRef.current && status?.step !== prevStepRef.current && !busy.includes(status?.step)) {
      const labels = {
        lyrics_review:  "✅ 가사 추출 완료! 아래에서 확인 후 다음 단계로 이동하세요.",
        scene_review:   "✅ 장면 분리 완료! 아래에서 장면을 확인하고 이미지 생성을 시작하세요.",
        image_review:   "✅ 이미지 생성 완료! 각 이미지를 검토하세요.",
        done:           "🎉 뮤직비디오 완성!"
      };
      const label = labels[status.step];
      if (label) { setMsg(label); setTimeout(() => window.scrollTo({ top: 400, behavior: "smooth" }), 300); }
    }
    prevStepRef.current = status?.step;
  }, [status?.step]);

  const doAction = async (fn, msg) => {
    setMsg(msg);
    try { await fn(); await load(); } catch (e) { setMsg('오류: ' + (e.response?.data?.message || e.message)); }
  };

  if (loading || !project) return <div className="mv-page"><p className="mv-info">로딩 중...</p></div>;

  const step     = project.step || 'upload';
  const scenes   = project.scenes || [];
  const isBusy   = ['transcribing','breaking_down','generating_images','generating_videos','merging'].includes(step);

  return (
    <div className="mv-page">
      <div className="mv-header" style={{ display:'flex', justifyContent:'space-between' }}>
        <div>
          <h1>🎵 {project.title}</h1>
          <p style={{ color:'#666' }}>음악 파일: {project.music_url ? '✅ 업로드됨' : '없음'} | 캐릭터 시트: {project.character_sheet_url ? '✅ 업로드됨' : '없음'}</p>
        </div>
        <button className="mv-btn-secondary" onClick={() => navigate('/admin/music-video')}>← 목록</button>
      </div>

      <StepBar step={step} />

      {/* ── 캐릭터 시트 관리 (항상 표시) ─────────────── */}
      <div className="mv-section">
        <h2>🖼️ 캐릭터 시트 <span style={{ color:"#999", fontSize:13, fontWeight:400 }}>({(project.character_sheets||[]).length}명 등록됨)</span></h2>
        <p className="mv-hint" style={{ marginBottom:12 }}>주인공이 여러 명이면 각각 캐릭터 시트를 추가하세요. AI가 모든 캐릭터를 레퍼런스로 사용합니다.</p>
        <div style={{ display:"flex", flexWrap:"wrap", gap:12, marginBottom:16 }}>
          {(project.character_sheets||[]).map(s => (
            <div key={s.id} style={{ textAlign:"center", position:"relative" }}>
              <img src={s.sheet_url} alt={s.name} style={{ width:120, height:120, objectFit:"cover", borderRadius:10, border:"2px solid #e91e63" }} />
              <div style={{ fontSize:12, fontWeight:600, marginTop:4 }}>{s.name}</div>
              <button onClick={async()=>{ await deleteCharSheet(id, s.id); load(); }}
                style={{ position:"absolute", top:-6, right:-6, width:22, height:22, borderRadius:"50%", border:"none", background:"#f44336", color:"#fff", cursor:"pointer", fontSize:12 }}>×</button>
            </div>
          ))}
          <div style={{ display:"flex", flexDirection:"column", gap:8, alignItems:"flex-start" }}>
            <input placeholder="캐릭터 이름" value={charName} onChange={e=>setCharName(e.target.value)}
              className="mv-input" style={{ width:140, fontSize:13 }} />
            <label className="mv-upload-zone" style={{ width:140, minHeight:50, padding:"8px 12px", fontSize:12 }}>
              <input type="file" accept="image/*" hidden onChange={e=>setCharFile(e.target.files[0])} />
              {charFile ? charFile.name.slice(0,15)+"..." : "📷 시트 선택"}
            </label>
            <button className="mv-btn-primary" style={{ fontSize:13, padding:"8px 14px" }}
              disabled={!charFile}
              onClick={async()=>{ if(!charFile) return; const fd=new FormData(); fd.append("character_sheet",charFile); fd.append("name",charName||"캐릭터"); await addCharSheet(id,fd); setCharFile(null); setCharName(""); load(); }}>
              + 추가
            </button>
          </div>
        </div>
      </div>

      {msg && <p className="mv-info">{msg}</p>}
      {isBusy && <p className="mv-info">⏳ 처리 중입니다... (자동 갱신 중)</p>}

      {/* ── 업로드 단계: 가사 추출 시작 버튼 ────────────── */}
      {step === 'upload' && project.music_url && (
        <div className="mv-section">
          <div className="mv-info" style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span>✅ 음악 파일과 캐릭터 시트 준비 완료! 이제 가사를 자동으로 추출합니다.</span>
            <button className="mv-btn-primary"
              onClick={() => doAction(() => transcribeLyrics(id), '⏳ AI가 가사를 추출하고 있습니다...')}>
              다음: 가사 자동 추출 시작 →
            </button>
          </div>
        </div>
      )}

      {/* ── 2단계: 가사 확인/수정 ──────────────────────────────── */}
      {['lyrics_review', 'transcribing'].includes(step) && (
        <div className="mv-section">
          <h2>2단계 — 가사 확인 및 수정</h2>
          {step === 'transcribing'
            ? <p className="mv-info">⏳ AI가 가사를 추출하고 있습니다...</p>
            : <>
                <p className="mv-hint" style={{ marginBottom:12 }}>
                  AI가 자동으로 추출한 가사입니다. 틀린 부분이 있으면 직접 수정해주세요.
                </p>
                <textarea className="mv-textarea" rows={12} value={editLyrics}
                  onChange={e => setEditLyrics(e.target.value)} />
                <div className="mv-actions">
                  <button className="mv-btn-secondary"
                    onClick={() => doAction(() => saveLyrics(id, { lyrics_edited: editLyrics }), '가사 저장 중...')}>
                    가사 저장
                  </button>
                  <button className="mv-btn-primary"
                    onClick={() => doAction(() => {
                      saveLyrics(id, { lyrics_edited: editLyrics });
                      return breakdownScenes(id, { images_per_scene: 2 });
                    }, '장면 분리 중...')}>
                    ✅ 확인 완료 → 장면 자동 분리
                  </button>
                </div>
              </>}
        </div>
      )}

      {/* ── 3단계: 장면 구성 확인 ──────────────────────────────── */}
      {['scene_review', 'breaking_down'].includes(step) && (
        <div className="mv-section">
          <h2>3단계 — 장면 구성 확인</h2>
          {step === 'breaking_down'
            ? <p className="mv-info">⏳ AI가 장면을 분리하고 있습니다...</p>
            : <>
                <p className="mv-hint" style={{ marginBottom:12 }}>
                  가사를 분석해서 장면을 구성했습니다. 각 장면의 이미지 프롬프트를 확인하고 수정할 수 있습니다.
                </p>
                <div className="mv-scene-grid">
                  {scenes.map(s => (
                    <div key={s.id} className="mv-scene-card">
                      <div className="mv-scene-header">
                        <div className="mv-scene-num">{s.scene_order}</div>
                        <div>
                          <div style={{ fontWeight:700 }}>{s.theme} — {s.emotion}</div>
                          <div style={{ fontSize:12, color:'#aaa' }}>{s.time_start}초 ~ {s.time_end}초</div>
                        </div>
                        <div className="mv-scene-time">{(s.time_end - s.time_start).toFixed(0)}초 구간</div>
                      </div>
                      <div className="mv-scene-body">
                        <p className="mv-scene-lyrics">"{s.lyrics_segment}"</p>
                        {(s.images || []).map(img => (
                          <div key={img.id} style={{ background:'#f8f9fa', borderRadius:8, padding:'10px 12px', marginBottom:8, fontSize:13 }}>
                            <div style={{ color:'#555', marginBottom:6 }}>이미지 {img.image_order}:</div>
                            <div style={{ color:'#333', lineHeight:1.6 }}>{img.prompt}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mv-actions" style={{ marginTop:24 }}>
                  <button className="mv-btn-secondary"
                    onClick={() => doAction(() => breakdownScenes(id, { images_per_scene: 2 }), '장면 재분리 중...')}>
                    🔄 다시 분리
                  </button>
                  <button className="mv-btn-primary"
                    onClick={() => doAction(() => generateImages(id), '이미지 생성 시작...')}>
                    ✅ 확인 완료 → 이미지 생성 시작
                  </button>
                </div>
              </>}
        </div>
      )}

      {/* ── 4단계: 이미지 검토 ────────────────────────────────── */}
      {['image_review', 'generating_images', 'generating_videos'].includes(step) && (
        <div className="mv-section">
          <h2>4단계 — 이미지 검토</h2>
          {status && (
            <div style={{ marginBottom:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6, fontSize:14 }}>
                <span>이미지 생성: {status.images_done}/{status.images_total}장 완료</span>
                <span>영상 클립: {status.videos_done}/{status.images_total}개 완료</span>
              </div>
              <div className="mv-progress-track">
                <div className="mv-progress-fill" style={{ width: `${status.images_total > 0 ? (status.images_done / status.images_total * 100) : 0}%` }} />
              </div>
            </div>
          )}
          <div className="mv-image-grid">
            {scenes.flatMap(s => (s.images || []).map(img => (
              <div key={img.id} className={`mv-image-card ${img.image_status}`}>
                {img.image_url
                  ? <img src={img.image_url} alt={`이미지 ${img.image_order}`} className="mv-image-thumb" />
                  : <div className="mv-image-thumb" style={{ display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, color:'#bbb' }}>
                      {img.image_status === 'generating' ? '⚙️ 생성 중...' : img.image_status === 'failed' ? '❌ 실패' : '⏳ 대기'}
                    </div>}
                <div className="mv-image-body">
                  <div style={{ fontSize:11, color:'#888', marginBottom:6 }}>
                    장면 {s.scene_order} · 이미지 {img.image_order}
                    {img.video_status === 'done' && <span style={{ marginLeft:6, color:'#2e7d32' }}>🎬 영상완료</span>}
                  </div>
                  <p className="mv-image-prompt">{img.prompt}</p>
                  <div className="mv-image-actions">
                    <span className={`mv-status-badge mv-status-${img.image_status}`}>
                      {img.image_status === 'done' ? '완료' : img.image_status === 'failed' ? '실패' : img.image_status === 'generating' ? '생성중' : '대기'}
                    </span>
                    {(img.image_status === 'done' || img.image_status === 'failed') && (
                      <button className="mv-btn-sm mv-btn-regen"
                        onClick={() => doAction(() => regenerateImage(id, img.id), `이미지 ${img.image_order} 재생성 중...`)}>
                        🔄 재생성
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )))}
          </div>
          {step === 'image_review' && (
            <div className="mv-actions" style={{ marginTop:24 }}>
              <button className="mv-btn-secondary"
                onClick={() => doAction(() => generateVideos(id), '영상 클립 생성 중...')}>
                🎬 이미지 → 영상 클립 변환
              </button>
              <button className="mv-btn-primary"
                onClick={() => doAction(() => mergeProject(id), '최종 영상 합치기 중...')}>
                ✅ 확인 완료 → 최종 영상 합치기
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── 5단계: 최종 영상 ────────────────────────────────────── */}
      {['merging', 'done'].includes(step) && (
        <div className="mv-section">
          <h2>5단계 — 완성된 뮤직비디오</h2>
          {step === 'merging'
            ? <p className="mv-info">⏳ 최종 영상을 합치고 있습니다...</p>
            : project.final_video_url
              ? <>
                  <p className="mv-success">🎉 뮤직비디오가 완성되었습니다!</p>
                  <video src={project.final_video_url} controls className="mv-final-video" style={{ display:'block', marginBottom:16 }} />
                  <a className="mv-btn-primary" href={project.final_video_url} download>⬇ 최종 영상 다운로드</a>
                </>
              : <p className="mv-info">최종 영상 URL을 불러오는 중...</p>}
        </div>
      )}

      {step === 'failed' && (
        <div className="mv-section">
          <p className="mv-error">❌ 처리 중 오류가 발생했습니다. 다시 시도해주세요.</p>
          <button className="mv-btn-secondary" onClick={() => doAction(() => transcribeLyrics(id), '재시작...')}>
            처음부터 다시 시작
          </button>
        </div>
      )}
    </div>
  );
}

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import UserForm from '../../components/UserForm';
import VideoList from '../../components/VideoList';
import QuestionForm from '../../components/QuestionForm';
import { getUser, updateUser } from '../../api/users';
import { getVideos, uploadVideo } from '../../api/videos';
import { getQuestions, createQuestion, updateQuestion, deleteQuestion } from '../../api/questions';

export default function AdminUserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [videos, setVideos] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [editingQ, setEditingQ] = useState(null);
  const [addingQ, setAddingQ] = useState(false);
  const [qLoading, setQLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [uRes, vRes, qRes] = await Promise.all([getUser(id), getVideos(id), getQuestions(id)]);
      setUser(uRes.data.data);
      setVideos(vRes.data.data || []);
      setQuestions(qRes.data.data || []);
    } catch {
      alert('데이터 로드 실패');
      navigate('/admin/users');
    } finally { setLoading(false); }
  }, [id, navigate]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSaveUser = async (form) => {
    setSaving(true);
    try { await updateUser(id, form); alert('저장 완료'); fetchAll(); }
    catch (err) { alert(err.response?.data?.message || '저장 실패'); }
    finally { setSaving(false); }
  };

  const handleUploadVideo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true); setUploadProgress(0);
    try { await uploadVideo(id, file, setUploadProgress); fetchAll(); }
    catch (err) { alert(err.response?.data?.message || '업로드 실패'); }
    finally { setUploading(false); setUploadProgress(0); e.target.value = ''; }
  };

  const handleSaveQuestion = async (form) => {
    setQLoading(true);
    try {
      if (editingQ) { await updateQuestion(editingQ.id, form); setEditingQ(null); }
      else { await createQuestion(id, form); setAddingQ(false); }
      fetchAll();
    } catch { alert('질문 저장 실패'); }
    finally { setQLoading(false); }
  };

  const handleDeleteQ = async (qId) => {
    if (!window.confirm('질문을 삭제하시겠습니까?')) return;
    try { await deleteQuestion(qId); fetchAll(); }
    catch { alert('질문 삭제 실패'); }
  };

  if (loading) return <Layout><p>로딩 중...</p></Layout>;

  return (
    <Layout>
      <button onClick={() => navigate('/admin/users')} style={styles.back}>← 목록으로</button>
      <h1 style={styles.title}>{user?.name} 상세</h1>
      <code style={styles.code}>{user?.user_code}</code>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>기본 정보</h2>
        <UserForm initialData={user} onSubmit={handleSaveUser} loading={saving} />
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>영상 관리</h2>
        <div style={styles.uploadArea}>
          <label style={styles.uploadLabel}>
            {uploading ? `업로드 중... ${uploadProgress}%` : '+ 영상 파일 선택 (mp4, mov, webm / 최대 500MB)'}
            <input type="file" accept=".mp4,.mov,.webm" onChange={handleUploadVideo} disabled={uploading} style={{ display: 'none' }} />
          </label>
          {uploading && (
            <div style={styles.progressBar}>
              <div style={{ ...styles.progressFill, width: `${uploadProgress}%` }} />
            </div>
          )}
        </div>
        <VideoList videos={videos} onRefresh={fetchAll} />
      </section>

      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>AI 질문 관리</h2>
          {!addingQ && <button onClick={() => setAddingQ(true)} style={styles.btnAdd}>+ 질문 추가</button>}
        </div>
        {addingQ && (
          <div style={styles.formBox}>
            <QuestionForm onSubmit={handleSaveQuestion} onCancel={() => setAddingQ(false)} loading={qLoading} />
          </div>
        )}
        {questions.length === 0 && !addingQ ? (
          <p style={{ color: '#888', fontSize: 14 }}>등록된 질문이 없습니다.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {questions.map((q) => (
              <div key={q.id} style={styles.questionCard}>
                {editingQ?.id === q.id ? (
                  <QuestionForm initialData={editingQ} onSubmit={handleSaveQuestion} onCancel={() => setEditingQ(null)} loading={qLoading} />
                ) : (
                  <div>
                    <div style={styles.questionMeta}>
                      <span style={styles.qType}>{q.question_type}</span>
                      <span style={styles.qOrder}>순서: {q.sort_order}</span>
                      <span style={q.is_active ? styles.qActive : styles.qInactive}>{q.is_active ? '활성' : '비활성'}</span>
                    </div>
                    <p style={styles.questionText}>{q.question_text}</p>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => setEditingQ(q)} style={styles.btnEdit}>수정</button>
                      <button onClick={() => handleDeleteQ(q.id)} style={styles.btnDel}>삭제</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </Layout>
  );
}

const styles = {
  back: { background: 'none', border: 'none', color: '#3498db', cursor: 'pointer', fontSize: 14, padding: '0 0 12px', display: 'block' },
  title: { margin: '0 0 4px', fontSize: 24 },
  code: { background: '#eee', padding: '2px 8px', borderRadius: 4, fontSize: 13, color: '#555', display: 'inline-block', marginBottom: 24 },
  section: { background: '#fff', borderRadius: 10, padding: 24, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { margin: '0 0 16px', fontSize: 18, fontWeight: 600 },
  uploadArea: { marginBottom: 16 },
  uploadLabel: { display: 'inline-block', padding: '10px 18px', background: '#f0f4ff', border: '2px dashed #3498db', borderRadius: 7, cursor: 'pointer', fontSize: 14, color: '#3498db' },
  progressBar: { height: 6, background: '#eee', borderRadius: 3, marginTop: 8, overflow: 'hidden', width: 300 },
  progressFill: { height: '100%', background: '#3498db', transition: 'width 0.3s' },
  formBox: { background: '#f8f9fa', padding: 16, borderRadius: 8, marginBottom: 16 },
  btnAdd: { padding: '6px 14px', background: '#3498db', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 13 },
  questionCard: { background: '#f8f9fa', borderRadius: 8, padding: 14 },
  questionMeta: { display: 'flex', gap: 10, marginBottom: 6, alignItems: 'center' },
  qType: { background: '#dce8ff', color: '#2980b9', padding: '2px 8px', borderRadius: 10, fontSize: 12 },
  qOrder: { fontSize: 12, color: '#888' },
  qActive: { fontSize: 12, color: '#27ae60' },
  qInactive: { fontSize: 12, color: '#e74c3c' },
  questionText: { margin: '0 0 8px', fontSize: 14, color: '#333' },
  btnEdit: { padding: '4px 10px', background: '#f39c12', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 },
  btnDel: { padding: '4px 10px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 },
};

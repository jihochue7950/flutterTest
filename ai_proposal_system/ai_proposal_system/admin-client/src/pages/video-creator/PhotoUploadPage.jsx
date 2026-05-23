import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPhotos, uploadPhotos, deletePhoto, reorderPhotos } from '../../api/videoCreator';
import './vc.css';

export default function PhotoUploadPage() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const [photos, setPhotos]     = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError]       = useState('');

  const load = useCallback(async () => {
    const res = await getPhotos(id);
    setPhotos(res.data.data || []);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (photos.length + files.length > 30) {
      setError(`최대 30장까지 업로드 가능합니다. (현재 ${photos.length}장)`);
      return;
    }
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      files.forEach(f => fd.append('photos', f));
      await uploadPhotos(id, fd);
      await load();
    } catch (e) {
      setError(e.response?.data?.message || '업로드 실패');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (photoId) => {
    await deletePhoto(id, photoId);
    await load();
  };

  const handleMoveUp = async (idx) => {
    if (idx === 0) return;
    const newOrder = [...photos];
    [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
    const order = newOrder.map((p, i) => ({ id: p.id, sort_order: i }));
    await reorderPhotos(id, order);
    await load();
  };

  return (
    <div className="vc-page">
      <div className="vc-header">
        <h1>📷 사진 업로드</h1>
        <p>최대 30장의 사진을 업로드하고 순서를 조정하세요. ({photos.length}/30)</p>
      </div>

      <section className="vc-section">
        <label className="vc-upload-zone">
          <input type="file" multiple accept="image/jpeg,image/png" onChange={handleFileChange} hidden />
          <span>📁 클릭하여 사진 선택 (jpg, png)</span>
          <small>한 번에 여러 장 선택 가능</small>
        </label>
        {uploading && <p className="vc-info">업로드 중...</p>}
        {error    && <p className="vc-error">{error}</p>}
      </section>

      {photos.length > 0 && (
        <section className="vc-section">
          <h2>업로드된 사진 ({photos.length}장)</h2>
          <div className="vc-photo-grid">
            {photos.map((photo, idx) => (
              <div key={photo.id} className="vc-photo-item">
                <img src={photo.file_url} alt={photo.original_filename} />
                <div className="vc-photo-order">{idx + 1}</div>
                <div className="vc-photo-actions">
                  <button onClick={() => handleMoveUp(idx)} disabled={idx === 0}>↑</button>
                  <button className="vc-btn-danger" onClick={() => handleDelete(photo.id)}>삭제</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="vc-actions">
        <button className="vc-btn-secondary" onClick={() => navigate(`/video-creator/${id}`)}>← 이전</button>
        <button
          className="vc-btn-primary"
          onClick={() => navigate(`/video-creator/${id}/music`)}
          disabled={photos.length === 0}
        >
          음악 선택으로 이동 →
        </button>
      </div>
    </div>
  );
}

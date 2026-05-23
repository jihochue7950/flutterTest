import axios from 'axios';

const VC_API = process.env.REACT_APP_VC_API_URL || 'http://localhost:5000';

const vc = axios.create({ baseURL: VC_API });

// ── 프로젝트 ──────────────────────────────────────────────────────────────────
export const createProject  = (data) => vc.post('/api/video-projects', data);
export const getProject     = (id)   => vc.get(`/api/video-projects/${id}`);
export const getProjectStatus = (id) => vc.get(`/api/video-projects/${id}/status`);
export const getPreviewJson = (id)   => vc.get(`/api/video-projects/${id}/preview-json`);
export const getDownloadUrl = (id)   => vc.get(`/api/video-projects/${id}/download`);

// ── 사진 ──────────────────────────────────────────────────────────────────────
export const uploadPhotos = (id, formData) =>
  vc.post(`/api/video-projects/${id}/photos`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const getPhotos     = (id)       => vc.get(`/api/video-projects/${id}/photos`);
export const reorderPhotos = (id, order) => vc.put(`/api/video-projects/${id}/photos/reorder`, { order });
export const deletePhoto   = (id, pid)  => vc.delete(`/api/video-projects/${id}/photos/${pid}`);

// ── 음악 ──────────────────────────────────────────────────────────────────────
export const getMusicLibrary    = ()          => vc.get('/api/music-library');
export const getProjectMusic    = (id)        => vc.get(`/api/video-projects/${id}/music`);
export const selectLibraryMusic = (id, mlId)  => vc.post(`/api/video-projects/${id}/music/select`, { music_library_id: mlId });
export const uploadCustomMusic  = (id, form)  =>
  vc.post(`/api/video-projects/${id}/music/upload`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

// ── 시나리오 ──────────────────────────────────────────────────────────────────
export const saveScenario = (id, data) => vc.post(`/api/video-projects/${id}/scenario`, data);

// ── 렌더 ──────────────────────────────────────────────────────────────────────
export const getRenderStatus = (id) => vc.get(`/api/video-projects/${id}/render-status`);

// ── 관리자 ────────────────────────────────────────────────────────────────────
export const adminGetProjects = (params)  => vc.get('/api/admin/video-projects', { params });
export const adminGetProject  = (id)     => vc.get(`/api/admin/video-projects/${id}`);
export const adminStartRender = (id)     => vc.post(`/api/admin/video-projects/${id}/render`);
export const adminGetJobs     = ()       => vc.get('/api/admin/render-jobs');

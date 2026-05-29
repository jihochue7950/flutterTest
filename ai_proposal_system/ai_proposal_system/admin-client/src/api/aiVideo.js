import axios from 'axios';

const VC = axios.create({ baseURL: process.env.REACT_APP_VC_API_URL || 'http://localhost:5000' });
const BASE = '/api/admin/ai-video-projects';
const SCENE_BASE = '/api/admin/ai-video-scenes';

// ── 프로젝트 ──────────────────────────────────────────────────────────────────
export const listProjects      = (p)  => VC.get(BASE, { params: p });
export const getProject        = (id) => VC.get(`${BASE}/${id}`);
export const createProject     = (fd) => VC.post(BASE, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
export const deleteProject     = (id) => VC.delete(`${BASE}/${id}`);
export const uploadCharSheet   = (id, fd) => VC.post(`${BASE}/${id}/character-sheet`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });

// ── 장면 ──────────────────────────────────────────────────────────────────────
export const addScene          = (id, data) => VC.post(`${BASE}/${id}/scenes`, data);
export const updateScene       = (id, data) => VC.put(`${SCENE_BASE}/${id}`, data);
export const deleteScene       = (id)       => VC.delete(`${SCENE_BASE}/${id}`);
export const regenerateScene   = (id)       => VC.post(`${SCENE_BASE}/${id}/regenerate`);

// ── 생성 제어 ────────────────────────────────────────────────────────────────
export const generateProject   = (id) => VC.post(`${BASE}/${id}/generate`);
export const getStatus         = (id) => VC.get(`${BASE}/${id}/status`);
export const finalizeProject   = (id) => VC.post(`${BASE}/${id}/finalize`);

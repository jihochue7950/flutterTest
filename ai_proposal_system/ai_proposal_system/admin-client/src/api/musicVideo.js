import axios from 'axios';
const VC  = axios.create({ baseURL: process.env.REACT_APP_VC_API_URL || 'http://localhost:5001' });
const BASE = '/api/admin/mv-projects';

export const listProjects    = ()         => VC.get(BASE);
export const getProject      = (id)       => VC.get(`${BASE}/${id}`);
export const getStatus       = (id)       => VC.get(`${BASE}/${id}/status`);

export const createProject   = (fd)       => VC.post(BASE, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
export const transcribeLyrics = (id)      => VC.post(`${BASE}/${id}/transcribe`);
export const saveLyrics      = (id, body) => VC.put(`${BASE}/${id}/lyrics`, body);
export const breakdownScenes = (id, body) => VC.post(`${BASE}/${id}/breakdown`, body);
export const updateScene     = (id, sid, body) => VC.put(`${BASE}/${id}/scenes/${sid}`, body);
export const updatePrompt    = (id, iid, body) => VC.put(`${BASE}/${id}/images/${iid}/prompt`, body);
export const generateImages  = (id)       => VC.post(`${BASE}/${id}/generate-images`);
export const regenerateImage = (id, iid)  => VC.post(`${BASE}/${id}/images/${iid}/regenerate`);
export const generateVideos  = (id)       => VC.post(`${BASE}/${id}/generate-videos`);
export const mergeProject    = (id)       => VC.post(`${BASE}/${id}/merge`);

import axios from 'axios';
const VC = axios.create({ baseURL: process.env.REACT_APP_VC_API_URL || 'http://localhost:5001' });

export const addCharSheet    = (id, fd) =>
  VC.post(`/api/admin/mv-projects/${id}/character-sheets`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });

export const deleteCharSheet = (id, sheetId) =>
  VC.delete(`/api/admin/mv-projects/${id}/character-sheets/${sheetId}`);

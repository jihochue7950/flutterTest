import api from './axios';

export const getVideos = (userId) => api.get(`/admin/users/${userId}/videos`);

export const uploadVideo = (userId, file, onProgress) => {
  const formData = new FormData();
  formData.append('video', file);
  return api.post(`/admin/users/${userId}/videos`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress) onProgress(Math.round((e.loaded * 100) / e.total));
    },
  });
};

export const setActiveVideo = (videoId) => api.put(`/admin/videos/${videoId}/active`);
export const deleteVideo = (videoId) => api.delete(`/admin/videos/${videoId}`);

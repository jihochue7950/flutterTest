import api from './axios';

export const getQuestions = (userId) => api.get(`/admin/users/${userId}/questions`);
export const createQuestion = (userId, data) => api.post(`/admin/users/${userId}/questions`, data);
export const updateQuestion = (questionId, data) => api.put(`/admin/questions/${questionId}`, data);
export const deleteQuestion = (questionId) => api.delete(`/admin/questions/${questionId}`);

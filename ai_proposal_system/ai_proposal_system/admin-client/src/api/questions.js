import api from './axios';

export const getQuestions = (userId) => api.get(`/users/${userId}/questions`);
export const createQuestion = (userId, data) => api.post(`/users/${userId}/questions`, data);
export const updateQuestion = (questionId, data) => api.put(`/questions/${questionId}`, data);
export const deleteQuestion = (questionId) => api.delete(`/questions/${questionId}`);

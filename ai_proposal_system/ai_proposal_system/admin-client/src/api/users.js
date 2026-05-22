import api from './axios';

export const getUsers = () => api.get('/admin/users');
export const getUser = (id) => api.get(`/admin/users/${id}`);
export const createUser = (data) => api.post('/admin/users', data);
export const updateUser = (id, data) => api.put(`/admin/users/${id}`, data);
export const deleteUser = (id) => api.delete(`/admin/users/${id}`);

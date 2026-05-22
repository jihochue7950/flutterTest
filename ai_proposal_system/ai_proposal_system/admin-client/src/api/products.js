import axios from 'axios';
import api from './axios';

// 인증 없는 공개 클라이언트
const pub = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 30000,
});

// 공개 API
export const getProducts = () => pub.get('/products');
export const getProduct = (identifier) => pub.get(`/products/${identifier}`);

// 관리자 API
export const getProductsAdmin = () => api.get('/admin/products');
export const createProduct = (data) => api.post('/admin/products', data);
export const updateProduct = (id, data) => api.put(`/admin/products/${id}`, data);
export const deleteProduct = (id) => api.delete(`/admin/products/${id}`);

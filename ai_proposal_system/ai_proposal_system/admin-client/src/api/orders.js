import axios from 'axios';
import api from './axios';

const pub = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 30000,
});

// 공개 API
export const createOrder = (data) => pub.post('/orders', data);
export const getOrderByNumber = (orderNumber) => pub.get(`/orders/${orderNumber}`);
export const verifyAccess = (orderNumber, accessCode) =>
  pub.post('/orders/verify-access', { order_number: orderNumber, access_code: accessCode });

// 관리자 API
export const getOrdersAdmin = (params) => api.get('/admin/orders', { params });
export const getOrderAdmin = (id) => api.get(`/admin/orders/${id}`);
export const updateOrderStatus = (id, data) => api.patch(`/admin/orders/${id}/status`, data);

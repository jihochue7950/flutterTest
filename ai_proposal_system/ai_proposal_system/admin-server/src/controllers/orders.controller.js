const OrderModel = require('../models/order.model');
const ProductModel = require('../models/product.model');
const { success, error } = require('../utils/response');

// 공개: 주문 생성
const createOrder = async (req, res) => {
  try {
    const { product_id, buyer_name, phone, email } = req.body;
    if (!product_id || !buyer_name || !phone || !email) {
      return error(res, 'product_id, buyer_name, phone, email 은 필수입니다.', 400);
    }
    const product = await ProductModel.findById(product_id);
    if (!product || !product.is_active) {
      return error(res, '존재하지 않는 상품입니다.', 404);
    }
    const order = await OrderModel.create(req.body);
    return success(res, order, '주문이 접수되었습니다.', 201);
  } catch (err) {
    console.error('createOrder error:', err);
    return error(res, '주문 생성 실패', 500);
  }
};

// 공개: 주문 조회 (주문번호로)
const getOrderByNumber = async (req, res) => {
  try {
    const order = await OrderModel.findByOrderNumber(req.params.orderNumber);
    if (!order) return error(res, '주문을 찾을 수 없습니다.', 404);
    // 공개 응답 — 인증코드는 마스킹 없이 포함 (본인 확인용)
    return success(res, order);
  } catch (err) {
    return error(res, '주문 조회 실패', 500);
  }
};

// 공개: Flutter 앱 인증 (주문번호 + 인증코드)
const verifyAccess = async (req, res) => {
  try {
    const { order_number, access_code } = req.body;
    if (!order_number || !access_code) {
      return error(res, 'order_number, access_code 는 필수입니다.', 400);
    }
    const order = await OrderModel.verifyAccess(order_number, access_code);
    if (!order) {
      return error(res, '주문번호 또는 인증코드가 올바르지 않거나 아직 앱 사용이 활성화되지 않았습니다.', 401);
    }
    return success(res, {
      order_number: order.order_number,
      product_name: order.product_name,
      product_slug: order.product_slug,
      target_name: order.target_name,
      user_code: order.user_code,
      session_enabled: true,
    }, '인증 성공');
  } catch (err) {
    console.error('verifyAccess error:', err);
    return error(res, '인증 처리 실패', 500);
  }
};

// 관리자: 주문 목록
const getAllAdmin = async (req, res) => {
  try {
    const { page, limit, status, paymentStatus } = req.query;
    const result = await OrderModel.findAll({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      status, paymentStatus,
    });
    return success(res, result);
  } catch (err) {
    return error(res, '주문 목록 조회 실패', 500);
  }
};

// 관리자: 주문 상세
const getOneAdmin = async (req, res) => {
  try {
    const order = await OrderModel.findById(req.params.id);
    if (!order) return error(res, '주문을 찾을 수 없습니다.', 404);
    return success(res, order);
  } catch (err) {
    return error(res, '주문 조회 실패', 500);
  }
};

// 관리자: 주문 상태 변경 (결제상태, 진행상태, 앱접근 허용)
const updateStatus = async (req, res) => {
  try {
    const order = await OrderModel.updateStatus(req.params.id, req.body);
    if (!order) return error(res, '주문을 찾을 수 없습니다.', 404);
    return success(res, order, '주문 상태가 변경되었습니다.');
  } catch (err) {
    console.error('updateStatus error:', err);
    return error(res, '주문 상태 변경 실패', 500);
  }
};

module.exports = { createOrder, getOrderByNumber, verifyAccess, getAllAdmin, getOneAdmin, updateStatus };

const express = require('express');
const router = express.Router();
const { createOrder, getOrderByNumber, verifyAccess, createTestOrder } = require('../controllers/orders.controller');

// 공개 API (인증 불필요)
router.post('/verify-access', verifyAccess);  // Flutter 앱 인증
router.post('/test', createTestOrder);        // 결제 없이 테스트 주문 생성
router.post('/', createOrder);
router.get('/:orderNumber', getOrderByNumber);

module.exports = router;

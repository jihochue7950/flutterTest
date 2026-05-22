const express = require('express');
const router = express.Router();
const { createOrder, getOrderByNumber, verifyAccess } = require('../controllers/orders.controller');

// 공개 API (인증 불필요)
router.post('/verify-access', verifyAccess);   // Flutter 앱 인증 — /:orderNumber 앞에 선언
router.post('/', createOrder);
router.get('/:orderNumber', getOrderByNumber);

module.exports = router;

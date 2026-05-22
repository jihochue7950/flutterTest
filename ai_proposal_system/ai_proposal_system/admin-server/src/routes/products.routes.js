const express = require('express');
const router = express.Router();
const { getAll, getOne } = require('../controllers/products.controller');

// 공개 API (인증 불필요)
router.get('/', getAll);
router.get('/:identifier', getOne);

module.exports = router;

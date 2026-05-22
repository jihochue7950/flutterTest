const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth.middleware');
const { getAllAdmin, getOneAdmin, updateStatus } = require('../controllers/orders.controller');

router.use(auth);
router.get('/', getAllAdmin);
router.get('/:id', getOneAdmin);
router.patch('/:id/status', updateStatus);

module.exports = router;

const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth.middleware');
const { getAllAdmin, getOne, create, update, remove } = require('../controllers/products.controller');

router.use(auth);
router.get('/', getAllAdmin);
router.get('/:identifier', getOne);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

module.exports = router;

const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth.middleware');
const { getAll, getById, create, update, remove } = require('../controllers/users.controller');

router.use(auth);
router.get('/', getAll);
router.post('/', create);
router.get('/:id', getById);
router.put('/:id', update);
router.delete('/:id', remove);

module.exports = router;

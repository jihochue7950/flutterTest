const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth.middleware');
const { updateQuestion, deleteQuestion } = require('../controllers/questions.controller');

router.use(auth);
router.put('/:questionId', updateQuestion);
router.delete('/:questionId', deleteQuestion);

module.exports = router;

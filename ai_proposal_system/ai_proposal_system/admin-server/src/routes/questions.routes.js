const express = require('express');
const router = express.Router({ mergeParams: true });
const auth = require('../middlewares/auth.middleware');
const { getQuestions, createQuestion, updateQuestion, deleteQuestion } = require('../controllers/questions.controller');

router.use(auth);
router.get('/', getQuestions);
router.post('/', createQuestion);
router.put('/:questionId', updateQuestion);
router.delete('/:questionId', deleteQuestion);

module.exports = router;

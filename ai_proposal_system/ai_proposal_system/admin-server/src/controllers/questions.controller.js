const QuestionModel = require('../models/question.model');
const UserModel = require('../models/user.model');
const { success, error } = require('../utils/response');

const getQuestions = async (req, res) => {
  try {
    const user = await UserModel.findById(req.params.id);
    if (!user) return error(res, '사용자를 찾을 수 없습니다.', 404);

    const questions = await QuestionModel.findByUserCode(user.user_code);
    return success(res, questions);
  } catch (err) {
    console.error('getQuestions error:', err);
    return error(res, '질문 목록 조회 실패', 500);
  }
};

const createQuestion = async (req, res) => {
  const { question_type, question_text, sort_order, is_active } = req.body;
  if (!question_text) {
    return error(res, 'question_text는 필수입니다.', 400);
  }
  try {
    const user = await UserModel.findById(req.params.id);
    if (!user) return error(res, '사용자를 찾을 수 없습니다.', 404);

    const question = await QuestionModel.create({
      user_code: user.user_code,
      question_type,
      question_text,
      sort_order,
      is_active,
    });
    return success(res, question, '질문 등록 완료', 201);
  } catch (err) {
    console.error('createQuestion error:', err);
    return error(res, '질문 등록 실패', 500);
  }
};

const updateQuestion = async (req, res) => {
  const { question_type, question_text, sort_order, is_active } = req.body;
  if (!question_text) {
    return error(res, 'question_text는 필수입니다.', 400);
  }
  try {
    const existing = await QuestionModel.findById(req.params.questionId);
    if (!existing) return error(res, '질문을 찾을 수 없습니다.', 404);

    const question = await QuestionModel.update(req.params.questionId, {
      question_type,
      question_text,
      sort_order,
      is_active,
    });
    return success(res, question, '질문 수정 완료');
  } catch (err) {
    console.error('updateQuestion error:', err);
    return error(res, '질문 수정 실패', 500);
  }
};

const deleteQuestion = async (req, res) => {
  try {
    const existing = await QuestionModel.findById(req.params.questionId);
    if (!existing) return error(res, '질문을 찾을 수 없습니다.', 404);

    await QuestionModel.remove(req.params.questionId);
    return success(res, null, '질문 삭제 완료');
  } catch (err) {
    console.error('deleteQuestion error:', err);
    return error(res, '질문 삭제 실패', 500);
  }
};

module.exports = { getQuestions, createQuestion, updateQuestion, deleteQuestion };

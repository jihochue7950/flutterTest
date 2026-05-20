const UserModel = require('../models/user.model');
const VideoModel = require('../models/video.model');
const QuestionModel = require('../models/question.model');
const { success, error } = require('../utils/response');

const getProposalData = async (req, res) => {
  try {
    const user = await UserModel.findByUserCode(req.params.userCode);
    if (!user) return error(res, '사용자를 찾을 수 없습니다.', 404);

    const video = await VideoModel.findActiveByUserCode(user.user_code);
    const questions = await QuestionModel.findActiveByUserCode(user.user_code);

    return success(res, {
      user: { id: user.id, user_code: user.user_code, name: user.name },
      video: video || null,
      questions,
    });
  } catch (err) {
    console.error('getProposalData error:', err);
    return error(res, '데이터 조회 실패', 500);
  }
};

module.exports = { getProposalData };

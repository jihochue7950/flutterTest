const UserModel = require('../models/user.model');
const { success, error } = require('../utils/response');

const getAll = async (req, res) => {
  try {
    const users = await UserModel.findAll();
    return success(res, users);
  } catch (err) {
    console.error('getAll users error:', err);
    return error(res, '사용자 목록 조회 실패', 500);
  }
};

const getById = async (req, res) => {
  try {
    const user = await UserModel.findById(req.params.id);
    if (!user) return error(res, '사용자를 찾을 수 없습니다.', 404);
    return success(res, user);
  } catch (err) {
    console.error('getById user error:', err);
    return error(res, '사용자 조회 실패', 500);
  }
};

const create = async (req, res) => {
  const { user_code, name, phone, email, memo } = req.body;
  if (!user_code || !name) {
    return error(res, 'user_code와 name은 필수입니다.', 400);
  }
  try {
    const existing = await UserModel.findByUserCode(user_code);
    if (existing) return error(res, '이미 사용 중인 user_code입니다.', 409);

    const user = await UserModel.create({ user_code, name, phone, email, memo });
    return success(res, user, '사용자 등록 완료', 201);
  } catch (err) {
    console.error('create user error:', err);
    return error(res, '사용자 등록 실패', 500);
  }
};

const update = async (req, res) => {
  const { user_code, name, phone, email, memo } = req.body;
  if (!user_code || !name) {
    return error(res, 'user_code와 name은 필수입니다.', 400);
  }
  try {
    const existing = await UserModel.findById(req.params.id);
    if (!existing) return error(res, '사용자를 찾을 수 없습니다.', 404);

    const user = await UserModel.update(req.params.id, { user_code, name, phone, email, memo });
    return success(res, user, '사용자 수정 완료');
  } catch (err) {
    console.error('update user error:', err);
    return error(res, '사용자 수정 실패', 500);
  }
};

const remove = async (req, res) => {
  try {
    const existing = await UserModel.findById(req.params.id);
    if (!existing) return error(res, '사용자를 찾을 수 없습니다.', 404);

    await UserModel.remove(req.params.id);
    return success(res, null, '사용자 삭제 완료');
  } catch (err) {
    console.error('remove user error:', err);
    return error(res, '사용자 삭제 실패', 500);
  }
};

module.exports = { getAll, getById, create, update, remove };

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const jwtConfig = require('../config/jwt');
const { success, error } = require('../utils/response');

const login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return error(res, '아이디와 비밀번호를 입력하세요.', 400);
  }

  try {
    const [rows] = await db.execute('SELECT * FROM admins WHERE username = ?', [username]);
    const admin = rows[0];

    if (!admin) {
      return error(res, '아이디 또는 비밀번호가 올바르지 않습니다.', 401);
    }

    const isValid = await bcrypt.compare(password, admin.password);
    if (!isValid) {
      return error(res, '아이디 또는 비밀번호가 올바르지 않습니다.', 401);
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username, name: admin.name },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn }
    );

    return success(res, { token, admin: { id: admin.id, username: admin.username, name: admin.name } }, '로그인 성공');
  } catch (err) {
    console.error('Login error:', err);
    return error(res, '서버 오류가 발생했습니다.', 500);
  }
};

module.exports = { login };

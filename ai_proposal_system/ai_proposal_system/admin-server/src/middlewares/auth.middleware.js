const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const { error } = require('../utils/response');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return error(res, '인증 토큰이 없습니다.', 401);
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, jwtConfig.secret);
    req.admin = decoded;
    next();
  } catch (err) {
    return error(res, '유효하지 않거나 만료된 토큰입니다.', 401);
  }
};

module.exports = authMiddleware;

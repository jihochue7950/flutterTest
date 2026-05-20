require('dotenv').config();

module.exports = {
  secret: process.env.JWT_SECRET || 'fallback_secret_change_me',
  expiresIn: process.env.JWT_EXPIRES_IN || '24h',
};

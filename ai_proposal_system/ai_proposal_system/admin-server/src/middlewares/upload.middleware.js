const { upload } = require('../config/upload');
const { error } = require('../utils/response');

const uploadSingle = (req, res, next) => {
  upload.single('video')(req, res, (err) => {
    if (err) {
      return error(res, err.message || '파일 업로드 오류', 400);
    }
    next();
  });
};

module.exports = { uploadSingle };

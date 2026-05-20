const path = require('path');
const fs = require('fs');
const VideoModel = require('../models/video.model');
const UserModel = require('../models/user.model');
const { success, error } = require('../utils/response');
require('dotenv').config();

const getVideos = async (req, res) => {
  try {
    const user = await UserModel.findById(req.params.id);
    if (!user) return error(res, '사용자를 찾을 수 없습니다.', 404);

    const videos = await VideoModel.findByUserCode(user.user_code);
    return success(res, videos);
  } catch (err) {
    console.error('getVideos error:', err);
    return error(res, '영상 목록 조회 실패', 500);
  }
};

const uploadVideo = async (req, res) => {
  if (!req.file) {
    return error(res, '업로드된 파일이 없습니다.', 400);
  }

  try {
    const user = await UserModel.findById(req.params.id);
    if (!user) {
      fs.unlinkSync(req.file.path);
      return error(res, '사용자를 찾을 수 없습니다.', 404);
    }

    const baseUrl = process.env.SERVER_BASE_URL || `http://localhost:${process.env.PORT || 8080}`;
    const videoUrl = `${baseUrl}/videos/${req.file.filename}`;

    const video = await VideoModel.create({
      user_code: user.user_code,
      original_filename: req.file.originalname,
      stored_filename: req.file.filename,
      video_path: req.file.path,
      video_url: videoUrl,
      mime_type: req.file.mimetype,
      file_size: req.file.size,
    });

    return success(res, video, '영상 업로드 완료', 201);
  } catch (err) {
    console.error('uploadVideo error:', err);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return error(res, '영상 업로드 실패', 500);
  }
};

const setActiveVideo = async (req, res) => {
  try {
    const video = await VideoModel.findById(req.params.videoId);
    if (!video) return error(res, '영상을 찾을 수 없습니다.', 404);

    await VideoModel.setActive(req.params.videoId, video.user_code);
    return success(res, null, '대표 영상이 변경되었습니다.');
  } catch (err) {
    console.error('setActiveVideo error:', err);
    return error(res, '대표 영상 변경 실패', 500);
  }
};

const deleteVideo = async (req, res) => {
  try {
    const video = await VideoModel.remove(req.params.videoId);
    if (!video) return error(res, '영상을 찾을 수 없습니다.', 404);

    if (video.video_path && fs.existsSync(video.video_path)) {
      fs.unlinkSync(video.video_path);
    }

    return success(res, null, '영상이 삭제되었습니다.');
  } catch (err) {
    console.error('deleteVideo error:', err);
    return error(res, '영상 삭제 실패', 500);
  }
};

module.exports = { getVideos, uploadVideo, setActiveVideo, deleteVideo };

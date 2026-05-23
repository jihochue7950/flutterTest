'use strict';

const MusicLibraryModel = require('../models/music_library.model');
const VideoProjectModel = require('../models/video_project.model');

const ok  = (res, data, msg = '성공', code = 200) => res.status(code).json({ success: true, message: msg, data });
const err = (res, msg = '오류', code = 500) => res.status(code).json({ success: false, message: msg });

const BASE_URL = () => process.env.SERVER_BASE_URL || 'http://localhost:5000';

// GET /api/music-library
const getMusicLibrary = async (req, res) => {
  try {
    const list = await MusicLibraryModel.findAll();
    return ok(res, list);
  } catch (e) {
    return err(res, '음악 라이브러리 조회 실패');
  }
};

// POST /api/video-projects/:id/music/select  (라이브러리에서 선택)
const selectLibraryMusic = async (req, res) => {
  try {
    const { music_library_id } = req.body;
    if (!music_library_id) return err(res, 'music_library_id 필요', 400);
    const music = await MusicLibraryModel.findById(music_library_id);
    if (!music) return err(res, '음악을 찾을 수 없습니다.', 404);
    await MusicLibraryModel.setProjectMusic(req.params.id, { music_library_id });
    return ok(res, music, '음악 선택 완료');
  } catch (e) {
    return err(res, '음악 선택 실패');
  }
};

// POST /api/video-projects/:id/music/upload  (직접 업로드, multer 처리 후)
const uploadCustomMusic = async (req, res) => {
  try {
    const file = req.file;
    if (!file) return err(res, '음악 파일이 없습니다.', 400);
    const customUrl = `${BASE_URL()}/uploads/music/${file.filename}`;
    await MusicLibraryModel.setProjectMusic(req.params.id, {
      custom_filename: file.originalname,
      custom_url:      customUrl,
    });
    return ok(res, { custom_url: customUrl, filename: file.originalname }, '음악 업로드 완료', 201);
  } catch (e) {
    return err(res, '음악 업로드 실패');
  }
};

// GET /api/video-projects/:id/music
const getProjectMusic = async (req, res) => {
  try {
    const music = await MusicLibraryModel.getProjectMusic(req.params.id);
    return ok(res, music);
  } catch (e) {
    return err(res, '음악 조회 실패');
  }
};

module.exports = { getMusicLibrary, selectLibraryMusic, uploadCustomMusic, getProjectMusic };

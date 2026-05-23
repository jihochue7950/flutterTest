'use strict';

const path = require('path');
const ProjectPhotoModel  = require('../models/project_photo.model');
const VideoProjectModel  = require('../models/video_project.model');

const ok  = (res, data, msg = '성공', code = 200) => res.status(code).json({ success: true, message: msg, data });
const err = (res, msg = '오류', code = 500) => res.status(code).json({ success: false, message: msg });

const BASE_URL = () => process.env.SERVER_BASE_URL || 'http://localhost:5000';

// POST /api/video-projects/:id/photos  (multer 처리 후 호출)
const uploadPhotos = async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    const project   = await VideoProjectModel.findById(projectId);
    if (!project) return err(res, '프로젝트 없음', 404);

    const currentCount = await ProjectPhotoModel.countByProject(projectId);
    const files = req.files || [];

    if (currentCount + files.length > 30) {
      return err(res, `사진은 최대 30장까지 업로드 가능합니다. (현재 ${currentCount}장)`, 400);
    }

    const saved = await Promise.all(files.map(async (file, i) => {
      const fileUrl = `${BASE_URL()}/uploads/photos/${file.filename}`;
      return ProjectPhotoModel.create({
        project_id:       projectId,
        original_filename: file.originalname,
        stored_filename:  file.filename,
        file_url:         fileUrl,
        file_size:        file.size,
        sort_order:       currentCount + i,
      });
    }));

    return ok(res, saved, `사진 ${saved.length}장 업로드 완료`, 201);
  } catch (e) {
    console.error('uploadPhotos:', e.message);
    return err(res, '사진 업로드 실패');
  }
};

// GET /api/video-projects/:id/photos
const getPhotos = async (req, res) => {
  try {
    const photos = await ProjectPhotoModel.findByProject(req.params.id);
    return ok(res, photos);
  } catch (e) {
    return err(res, '사진 조회 실패');
  }
};

// PUT /api/video-projects/:id/photos/reorder
// body: { order: [{ id: 1, sort_order: 0 }, ...] }
const reorderPhotos = async (req, res) => {
  try {
    const { order } = req.body;
    if (!Array.isArray(order)) return err(res, 'order 배열이 필요합니다.', 400);
    await ProjectPhotoModel.reorder(req.params.id, order);
    const photos = await ProjectPhotoModel.findByProject(req.params.id);
    return ok(res, photos, '사진 순서 변경 완료');
  } catch (e) {
    return err(res, '사진 순서 변경 실패');
  }
};

// DELETE /api/video-projects/:id/photos/:photoId
const deletePhoto = async (req, res) => {
  try {
    const deleted = await ProjectPhotoModel.delete(req.params.photoId, req.params.id);
    if (!deleted) return err(res, '사진을 찾을 수 없습니다.', 404);
    return ok(res, deleted, '사진 삭제 완료');
  } catch (e) {
    return err(res, '사진 삭제 실패');
  }
};

module.exports = { uploadPhotos, getPhotos, reorderPhotos, deletePhoto };

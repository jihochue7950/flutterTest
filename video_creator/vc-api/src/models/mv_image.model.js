'use strict';
const db = require('../config/db');

const MvImage = {
  async bulkCreateForScene(projectId, sceneId, images) {
    await db.query('DELETE FROM mv_images WHERE scene_id=?', [sceneId]);
    for (const img of images) {
      await db.query(
        `INSERT INTO mv_images (project_id, scene_id, image_order, prompt, video_duration)
         VALUES (?, ?, ?, ?, ?)`,
        [projectId, sceneId, img.image_order, img.prompt || null, img.video_duration || 5]
      );
    }
  },

  async findByProject(projectId) {
    const [rows] = await db.query(
      'SELECT * FROM mv_images WHERE project_id=? ORDER BY scene_id, image_order',
      [projectId]
    );
    return rows;
  },

  async findById(id) {
    const [rows] = await db.query('SELECT * FROM mv_images WHERE id=?', [id]);
    return rows[0] || null;
  },

  async updateImageResult(id, { image_url, image_path, image_status, image_error, fal_request_id }) {
    await db.query(
      `UPDATE mv_images SET image_url=?, image_path=?, image_status=?,
       image_error=?, fal_request_id=?, updated_at=NOW() WHERE id=?`,
      [image_url || null, image_path || null, image_status,
       image_error || null, fal_request_id || null, id]
    );
  },

  async updateVideoResult(id, { video_url, video_path, video_status, video_error }) {
    await db.query(
      `UPDATE mv_images SET video_url=?, video_path=?, video_status=?,
       video_error=?, updated_at=NOW() WHERE id=?`,
      [video_url || null, video_path || null, video_status, video_error || null, id]
    );
  },

  async resetImage(id) {
    await db.query(
      `UPDATE mv_images SET image_url=NULL, image_path=NULL, image_status='pending',
       image_error=NULL, video_url=NULL, video_path=NULL, video_status='pending',
       video_error=NULL, updated_at=NOW() WHERE id=?`, [id]
    );
  },

  async countByStatus(projectId, imageStatus) {
    const [[{ cnt }]] = await db.query(
      'SELECT COUNT(*) AS cnt FROM mv_images WHERE project_id=? AND image_status=?',
      [projectId, imageStatus]
    );
    return cnt;
  },
};

module.exports = MvImage;

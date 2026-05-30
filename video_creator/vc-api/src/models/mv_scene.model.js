'use strict';
const db = require('../config/db');

const MvScene = {
  async findByProject(projectId) {
    const [rows] = await db.query(
      `SELECT s.*,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', i.id, 'image_order', i.image_order,
            'prompt', i.prompt,
            'image_url', i.image_url, 'image_status', i.image_status, 'image_error', i.image_error,
            'video_url', i.video_url, 'video_status', i.video_status, 'video_duration', i.video_duration
          ) ORDER BY i.image_order
        ) AS images
       FROM mv_scenes s
       LEFT JOIN mv_images i ON i.scene_id = s.id
       WHERE s.project_id=?
       GROUP BY s.id
       ORDER BY s.scene_order ASC`,
      [projectId]
    );
    // JSON_ARRAYAGG가 null인 경우 처리
    return rows.map(r => ({
      ...r,
      images: r.images ? (typeof r.images === 'string' ? JSON.parse(r.images) : r.images).filter(i => i.id) : [],
    }));
  },

  async bulkCreate(projectId, scenes) {
    // 기존 장면 삭제 후 재생성
    await db.query('DELETE FROM mv_scenes WHERE project_id=?', [projectId]);
    for (const s of scenes) {
      await db.query(
        `INSERT INTO mv_scenes (project_id, scene_order, time_start, time_end, theme, emotion, lyrics_segment)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [projectId, s.scene_order, s.time_start, s.time_end,
         s.theme || null, s.emotion || null, s.lyrics_segment || null]
      );
    }
  },

  async update(id, { theme, emotion, lyrics_segment, time_start, time_end }) {
    await db.query(
      `UPDATE mv_scenes SET theme=?, emotion=?, lyrics_segment=?,
       time_start=?, time_end=?, updated_at=NOW() WHERE id=?`,
      [theme, emotion, lyrics_segment, time_start, time_end, id]
    );
  },

  async updateStatus(id, status) {
    await db.query('UPDATE mv_scenes SET status=?, updated_at=NOW() WHERE id=?', [status, id]);
  },
};

module.exports = MvScene;

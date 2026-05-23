'use strict';

const db = require('../config/db');

const ProjectPhotoModel = {
  async findByProject(projectId) {
    const [rows] = await db.query(
      'SELECT * FROM project_photos WHERE project_id = ? ORDER BY sort_order ASC, id ASC',
      [projectId]
    );
    return rows;
  },

  async create({ project_id, original_filename, stored_filename, file_url, file_size, sort_order }) {
    const [result] = await db.query(
      `INSERT INTO project_photos (project_id, original_filename, stored_filename, file_url, file_size, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [project_id, original_filename, stored_filename, file_url, file_size || 0, sort_order || 0]
    );
    const [rows] = await db.query('SELECT * FROM project_photos WHERE id = ?', [result.insertId]);
    return rows[0];
  },

  async reorder(projectId, orderedIds) {
    // orderedIds: [{ id, sort_order }] 배열
    const updates = orderedIds.map(({ id, sort_order }) =>
      db.query('UPDATE project_photos SET sort_order = ? WHERE id = ? AND project_id = ?',
               [sort_order, id, projectId])
    );
    await Promise.all(updates);
  },

  async updateAiTags(id, { ai_sort_order, scene_label, emotion_tag }) {
    await db.query(
      'UPDATE project_photos SET ai_sort_order = ?, scene_label = ?, emotion_tag = ? WHERE id = ?',
      [ai_sort_order, scene_label, emotion_tag, id]
    );
  },

  async delete(id, projectId) {
    const [rows] = await db.query(
      'SELECT * FROM project_photos WHERE id = ? AND project_id = ?', [id, projectId]
    );
    if (!rows[0]) return null;
    await db.query('DELETE FROM project_photos WHERE id = ?', [id]);
    return rows[0];
  },

  async countByProject(projectId) {
    const [[{ cnt }]] = await db.query(
      'SELECT COUNT(*) AS cnt FROM project_photos WHERE project_id = ?', [projectId]
    );
    return cnt;
  },
};

module.exports = ProjectPhotoModel;

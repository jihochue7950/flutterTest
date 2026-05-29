'use strict';

const db = require('../config/db');

const AiVideoProjectModel = {
  async findAll({ page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    const [rows] = await db.query(
      `SELECT p.*,
        (SELECT COUNT(*) FROM ai_video_scenes s WHERE s.project_id = p.id) AS scene_count,
        (SELECT COUNT(*) FROM ai_video_scenes s WHERE s.project_id = p.id AND s.status = 'done') AS done_count
       FROM ai_video_projects p
       ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM ai_video_projects');
    return { rows, total, page, limit };
  },

  async findById(id) {
    const [rows] = await db.query(
      'SELECT * FROM ai_video_projects WHERE id = ?', [id]
    );
    return rows[0] || null;
  },

  async create({ title, description, fal_model }) {
    const [result] = await db.query(
      `INSERT INTO ai_video_projects (title, description, global_prompt, character_description, fal_model)
       VALUES (?, ?, ?, ?, ?)`,
      [title, description || null, global_prompt || null, character_description || null,
       fal_model || 'fal-ai/kling-video/o1/reference-to-video']
    );
    return this.findById(result.insertId);
  },

  async updateCharacterSheet(id, { character_sheet_url, character_sheet_path }) {
    await db.query(
      'UPDATE ai_video_projects SET character_sheet_url=?, character_sheet_path=?, updated_at=NOW() WHERE id=?',
      [character_sheet_url, character_sheet_path, id]
    );
    return this.findById(id);
  },

  async updateStatus(id, status, extras = {}) {
    const sets = ['status = ?', 'updated_at = NOW()'];
    const vals = [status];
    if (extras.final_video_url)  { sets.push('final_video_url = ?');  vals.push(extras.final_video_url);  }
    if (extras.final_video_path) { sets.push('final_video_path = ?'); vals.push(extras.final_video_path); }
    if (extras.total_scenes      != null) { sets.push('total_scenes = ?');     vals.push(extras.total_scenes);      }
    if (extras.completed_scenes  != null) { sets.push('completed_scenes = ?'); vals.push(extras.completed_scenes);  }
    vals.push(id);
    await db.query(`UPDATE ai_video_projects SET ${sets.join(', ')} WHERE id = ?`, vals);
    return this.findById(id);
  },

  async incrementCompleted(id) {
    await db.query(
      'UPDATE ai_video_projects SET completed_scenes = completed_scenes + 1, updated_at=NOW() WHERE id=?',
      [id]
    );
  },

  async delete(id) {
    await db.query('DELETE FROM ai_video_projects WHERE id=?', [id]);
  },
};

module.exports = AiVideoProjectModel;

'use strict';

const db = require('../config/db');

const VideoProjectModel = {
  async findAll({ page = 1, limit = 20, status } = {}) {
    const offset = (page - 1) * limit;
    const where  = status ? 'WHERE status = ?' : '';
    const params = status ? [status, limit, offset] : [limit, offset];
    const [rows] = await db.query(
      `SELECT * FROM video_projects ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      params
    );
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM video_projects ${where}`,
      status ? [status] : []
    );
    return { rows, total, page, limit };
  },

  async findById(id) {
    const [rows] = await db.query(
      `SELECT vp.*,
              (SELECT JSON_ARRAYAGG(
                JSON_OBJECT('id', pp.id, 'file_url', pp.file_url,
                            'sort_order', pp.sort_order, 'scene_label', pp.scene_label,
                            'emotion_tag', pp.emotion_tag, 'stored_filename', pp.stored_filename)
                ORDER BY pp.sort_order
              ) FROM project_photos pp WHERE pp.project_id = vp.id) AS photos,
              (SELECT JSON_OBJECT(
                'library_id', pm.music_library_id,
                'custom_url', pm.custom_url,
                'title', ml.title
              ) FROM project_music pm
               LEFT JOIN music_library ml ON ml.id = pm.music_library_id
               WHERE pm.project_id = vp.id LIMIT 1) AS music
       FROM video_projects vp WHERE vp.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async create({ event_type, style, title, order_id, user_code }) {
    const [result] = await db.query(
      `INSERT INTO video_projects (event_type, style, title, order_id, user_code, status)
       VALUES (?, ?, ?, ?, ?, 'draft')`,
      [event_type, style, title || null, order_id || null, user_code || null]
    );
    return this.findById(result.insertId);
  },

  async updateScenario(id, { user_scenario, ai_scenario, scene_json, status }) {
    await db.query(
      `UPDATE video_projects
       SET user_scenario = COALESCE(?, user_scenario),
           ai_scenario   = COALESCE(?, ai_scenario),
           scene_json    = COALESCE(?, scene_json),
           status        = COALESCE(?, status),
           updated_at    = NOW()
       WHERE id = ?`,
      [user_scenario, ai_scenario, scene_json ? JSON.stringify(scene_json) : null, status, id]
    );
    return this.findById(id);
  },

  async updateStatus(id, status, extras = {}) {
    const sets = ['status = ?', 'updated_at = NOW()'];
    const vals = [status];
    if (extras.output_video_url) { sets.push('output_video_url = ?'); vals.push(extras.output_video_url); }
    if (extras.preview_url)      { sets.push('preview_url = ?');      vals.push(extras.preview_url);      }
    vals.push(id);
    await db.query(`UPDATE video_projects SET ${sets.join(', ')} WHERE id = ?`, vals);
    return this.findById(id);
  },
};

module.exports = VideoProjectModel;

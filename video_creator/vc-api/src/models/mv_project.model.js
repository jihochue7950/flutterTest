'use strict';
const db = require('../config/db');

const MvProject = {
  async findAll({ page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    const [rows] = await db.query(
      `SELECT p.*,
        (SELECT COUNT(*) FROM mv_scenes s WHERE s.project_id = p.id) AS scene_count,
        (SELECT COUNT(*) FROM mv_images i WHERE i.project_id = p.id AND i.image_status = 'done') AS images_done
       FROM mv_projects p ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM mv_projects');
    return { rows, total, page, limit };
  },

  async findById(id) {
    const [rows] = await db.query('SELECT * FROM mv_projects WHERE id=?', [id]);
    return rows[0] || null;
  },

  async create({ title, global_style, character_desc, image_model, video_model }) {
    const [r] = await db.query(
      `INSERT INTO mv_projects (title, global_style, character_desc, image_model, video_model)
       VALUES (?, ?, ?, ?, ?)`,
      [title, global_style || null, character_desc || null,
       image_model || 'fal-ai/flux-pro/kontext',
       video_model || 'fal-ai/kling-video/v1.6/pro']
    );
    return this.findById(r.insertId);
  },

  async updateMusic(id, { music_url, music_path, music_duration }) {
    await db.query(
      'UPDATE mv_projects SET music_url=?, music_path=?, music_duration=?, updated_at=NOW() WHERE id=?',
      [music_url, music_path, music_duration || 0, id]
    );
  },

  async updateCharacterSheet(id, { character_sheet_url, character_sheet_path }) {
    await db.query(
      'UPDATE mv_projects SET character_sheet_url=?, character_sheet_path=?, updated_at=NOW() WHERE id=?',
      [character_sheet_url, character_sheet_path, id]
    );
  },

  async updateLyrics(id, { lyrics_raw, lyrics_edited, step }) {
    const sets = ['updated_at=NOW()'];
    const vals = [];
    if (lyrics_raw    !== undefined) { sets.push('lyrics_raw=?');    vals.push(lyrics_raw); }
    if (lyrics_edited !== undefined) { sets.push('lyrics_edited=?'); vals.push(lyrics_edited); }
    if (step          !== undefined) { sets.push('step=?');          vals.push(step); }
    vals.push(id);
    await db.query(`UPDATE mv_projects SET ${sets.join(',')} WHERE id=?`, vals);
    return this.findById(id);
  },

  async updateStep(id, step, extras = {}) {
    const sets = ['step=?', 'updated_at=NOW()'];
    const vals = [step];
    if (extras.final_video_url)  { sets.push('final_video_url=?');  vals.push(extras.final_video_url);  }
    if (extras.final_video_path) { sets.push('final_video_path=?'); vals.push(extras.final_video_path); }
    vals.push(id);
    await db.query(`UPDATE mv_projects SET ${sets.join(',')} WHERE id=?`, vals);
    return this.findById(id);
  },

  async delete(id) {
    await db.query('DELETE FROM mv_projects WHERE id=?', [id]);
  },
};

module.exports = MvProject;

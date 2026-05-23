'use strict';

const db = require('../config/db');

const MusicLibraryModel = {
  async findAll() {
    const [rows] = await db.query(
      'SELECT * FROM music_library WHERE is_active = 1 ORDER BY sort_order ASC'
    );
    return rows;
  },

  async findById(id) {
    const [rows] = await db.query('SELECT * FROM music_library WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async setProjectMusic(projectId, { music_library_id, custom_filename, custom_url }) {
    // 기존 음악 설정 삭제 후 새로 등록
    await db.query('DELETE FROM project_music WHERE project_id = ?', [projectId]);
    await db.query(
      'INSERT INTO project_music (project_id, music_library_id, custom_filename, custom_url) VALUES (?, ?, ?, ?)',
      [projectId, music_library_id || null, custom_filename || null, custom_url || null]
    );
  },

  async getProjectMusic(projectId) {
    const [rows] = await db.query(
      `SELECT pm.*, ml.title, ml.artist, ml.mood, ml.duration_sec, ml.file_url AS library_url
       FROM project_music pm
       LEFT JOIN music_library ml ON ml.id = pm.music_library_id
       WHERE pm.project_id = ?`,
      [projectId]
    );
    return rows[0] || null;
  },
};

module.exports = MusicLibraryModel;

'use strict';
const db = require('../config/db');

const MvCharacterSheet = {
  async findByProject(projectId) {
    const [rows] = await db.query(
      'SELECT * FROM mv_character_sheets WHERE project_id=? ORDER BY char_order ASC',
      [projectId]
    );
    return rows;
  },

  async create({ project_id, name, sheet_url, sheet_path, char_order }) {
    const [r] = await db.query(
      'INSERT INTO mv_character_sheets (project_id, name, sheet_url, sheet_path, char_order) VALUES (?,?,?,?,?)',
      [project_id, name || '캐릭터', sheet_url, sheet_path, char_order || 0]
    );
    const [rows] = await db.query('SELECT * FROM mv_character_sheets WHERE id=?', [r.insertId]);
    return rows[0];
  },

  async delete(id, projectId) {
    await db.query('DELETE FROM mv_character_sheets WHERE id=? AND project_id=?', [id, projectId]);
  },

  async getUrls(projectId) {
    const rows = await this.findByProject(projectId);
    return rows.map(r => r.sheet_url).filter(Boolean);
  },
};

module.exports = MvCharacterSheet;

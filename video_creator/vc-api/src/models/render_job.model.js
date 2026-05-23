'use strict';

const db = require('../config/db');

const RenderJobModel = {
  async findAll() {
    const [rows] = await db.query(
      `SELECT rj.*, vp.title, vp.event_type, vp.style
       FROM render_jobs rj
       LEFT JOIN video_projects vp ON vp.id = rj.project_id
       ORDER BY rj.created_at DESC LIMIT 50`
    );
    return rows;
  },

  async findByProject(projectId) {
    const [rows] = await db.query(
      'SELECT * FROM render_jobs WHERE project_id = ? ORDER BY created_at DESC LIMIT 1',
      [projectId]
    );
    return rows[0] || null;
  },

  async create(projectId, triggeredBy = 'admin') {
    const [result] = await db.query(
      'INSERT INTO render_jobs (project_id, status, triggered_by) VALUES (?, "queued", ?)',
      [projectId, triggeredBy]
    );
    const [rows] = await db.query('SELECT * FROM render_jobs WHERE id = ?', [result.insertId]);
    return rows[0];
  },

  async updateProgress(id, progress) {
    await db.query('UPDATE render_jobs SET progress = ? WHERE id = ?', [progress, id]);
  },

  async start(id) {
    await db.query(
      'UPDATE render_jobs SET status = "processing", started_at = NOW(), progress = 0 WHERE id = ?',
      [id]
    );
  },

  async complete(id, outputPath) {
    await db.query(
      'UPDATE render_jobs SET status = "done", progress = 100, completed_at = NOW(), output_path = ? WHERE id = ?',
      [outputPath, id]
    );
  },

  async fail(id, errorMessage) {
    await db.query(
      'UPDATE render_jobs SET status = "failed", completed_at = NOW(), error_message = ? WHERE id = ?',
      [errorMessage, id]
    );
  },
};

module.exports = RenderJobModel;

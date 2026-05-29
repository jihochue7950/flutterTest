'use strict';

const db = require('../config/db');

const SAME_CLOTHES = 'same clothes as previous scene';
const SAME_BG      = 'same background as previous scene';

const AiVideoSceneModel = {
  // 장면 목록 (scene_order ASC — 반드시 순서 유지)
  async findByProject(projectId) {
    const [rows] = await db.query(
      'SELECT * FROM ai_video_scenes WHERE project_id = ? ORDER BY scene_order ASC',
      [projectId]
    );
    return rows;
  },

  async findById(id) {
    const [rows] = await db.query('SELECT * FROM ai_video_scenes WHERE id=?', [id]);
    return rows[0] || null;
  },

  async create({ project_id, scene_order, scenario, duration_seconds, clothing, background, direction }) {
    const [result] = await db.query(
      `INSERT INTO ai_video_scenes
         (project_id, scene_order, scenario, duration_seconds, clothing, background, direction)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [project_id, scene_order, scenario, duration_seconds || 5,
       clothing || null, background || null, direction || null]
    );
    // 프로젝트 total_scenes 증가
    await db.query(
      'UPDATE ai_video_projects SET total_scenes = total_scenes + 1, updated_at=NOW() WHERE id=?',
      [project_id]
    );
    return this.findById(result.insertId);
  },

  async update(id, fields) {
    const allowed = ['scene_order','scenario','duration_seconds','clothing','background','direction'];
    const sets = ['updated_at = NOW()'];
    const vals = [];
    for (const key of allowed) {
      if (fields[key] !== undefined) { sets.push(`${key} = ?`); vals.push(fields[key]); }
    }
    if (sets.length === 1) return this.findById(id);
    vals.push(id);
    await db.query(`UPDATE ai_video_scenes SET ${sets.join(', ')} WHERE id=?`, vals);
    return this.findById(id);
  },

  // 순차 생성 전 의상/배경 상속 처리
  resolveFields(scene, prevScene) {
    return {
      resolved_clothing:   scene.clothing   === SAME_CLOTHES && prevScene
                             ? prevScene.resolved_clothing || prevScene.clothing
                             : scene.clothing,
      resolved_background: scene.background === SAME_BG && prevScene
                             ? prevScene.resolved_background || prevScene.background
                             : scene.background,
    };
  },

  async updateGenerating(id, { resolved_clothing, resolved_background, prompt }) {
    await db.query(
      `UPDATE ai_video_scenes
       SET status='generating', resolved_clothing=?, resolved_background=?, prompt=?, updated_at=NOW()
       WHERE id=?`,
      [resolved_clothing, resolved_background, prompt, id]
    );
  },

  async updateDone(id, { video_url, video_path, last_frame_url, last_frame_path, fal_request_id }) {
    await db.query(
      `UPDATE ai_video_scenes
       SET status='done', video_url=?, video_path=?, last_frame_url=?, last_frame_path=?,
           fal_request_id=?, updated_at=NOW()
       WHERE id=?`,
      [video_url, video_path, last_frame_url || null, last_frame_path || null, fal_request_id || null, id]
    );
    return this.findById(id);
  },

  async updateFailed(id, errorMessage) {
    await db.query(
      `UPDATE ai_video_scenes SET status='failed', error_message=?, updated_at=NOW() WHERE id=?`,
      [errorMessage, id]
    );
  },

  async resetStatus(id) {
    await db.query(
      `UPDATE ai_video_scenes
       SET status='pending', video_url=NULL, video_path=NULL,
           last_frame_url=NULL, last_frame_path=NULL, error_message=NULL, updated_at=NOW()
       WHERE id=?`,
      [id]
    );
  },

  async delete(id) {
    const [rows] = await db.query('SELECT project_id FROM ai_video_scenes WHERE id=?', [id]);
    if (!rows[0]) return;
    await db.query('DELETE FROM ai_video_scenes WHERE id=?', [id]);
    await db.query(
      'UPDATE ai_video_projects SET total_scenes = GREATEST(0, total_scenes - 1), updated_at=NOW() WHERE id=?',
      [rows[0].project_id]
    );
  },
};

module.exports = AiVideoSceneModel;

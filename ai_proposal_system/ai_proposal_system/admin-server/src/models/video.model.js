const db = require('../config/db');

const findByUserCode = async (userCode) => {
  const [rows] = await db.execute(
    'SELECT * FROM user_videos WHERE user_code = ? ORDER BY created_at DESC',
    [userCode]
  );
  return rows;
};

const findActiveByUserCode = async (userCode) => {
  const [rows] = await db.execute(
    'SELECT * FROM user_videos WHERE user_code = ? AND is_active = 1 LIMIT 1',
    [userCode]
  );
  return rows[0] || null;
};

const findById = async (id) => {
  const [rows] = await db.execute('SELECT * FROM user_videos WHERE id = ?', [id]);
  return rows[0] || null;
};

const create = async ({ user_code, original_filename, stored_filename, video_path, video_url, mime_type, file_size }) => {
  const [result] = await db.execute(
    `INSERT INTO user_videos
     (user_code, original_filename, stored_filename, video_path, video_url, mime_type, file_size, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
    [user_code, original_filename, stored_filename, video_path, video_url, mime_type, file_size]
  );
  return findById(result.insertId);
};

const setActive = async (videoId, userCode) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute('UPDATE user_videos SET is_active = 0 WHERE user_code = ?', [userCode]);
    await conn.execute('UPDATE user_videos SET is_active = 1 WHERE id = ?', [videoId]);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

const remove = async (id) => {
  const video = await findById(id);
  if (!video) return null;
  await db.execute('DELETE FROM user_videos WHERE id = ?', [id]);
  return video;
};

module.exports = { findByUserCode, findActiveByUserCode, findById, create, setActive, remove };

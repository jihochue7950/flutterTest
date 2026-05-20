const db = require('../config/db');

const findByUserCode = async (userCode) => {
  const [rows] = await db.execute(
    'SELECT * FROM ai_questions WHERE user_code = ? ORDER BY sort_order ASC, id ASC',
    [userCode]
  );
  return rows;
};

const findActiveByUserCode = async (userCode) => {
  const [rows] = await db.execute(
    'SELECT id, question_type, question_text, answer_type, expected_answer, sort_order FROM ai_questions WHERE user_code = ? AND is_active = 1 ORDER BY sort_order ASC, id ASC',
    [userCode]
  );
  return rows;
};

const findById = async (id) => {
  const [rows] = await db.execute('SELECT * FROM ai_questions WHERE id = ?', [id]);
  return rows[0] || null;
};

const create = async ({ user_code, question_type, question_text, answer_type, expected_answer, sort_order, is_active }) => {
  const [result] = await db.execute(
    'INSERT INTO ai_questions (user_code, question_type, question_text, answer_type, expected_answer, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [user_code, question_type || 'custom', question_text, answer_type || 'open', expected_answer || null, sort_order || 0, is_active !== undefined ? is_active : 1]
  );
  return findById(result.insertId);
};

const update = async (id, { question_type, question_text, answer_type, expected_answer, sort_order, is_active }) => {
  await db.execute(
    'UPDATE ai_questions SET question_type = ?, question_text = ?, answer_type = ?, expected_answer = ?, sort_order = ?, is_active = ? WHERE id = ?',
    [question_type, question_text, answer_type || 'open', expected_answer || null, sort_order, is_active, id]
  );
  return findById(id);
};

const remove = async (id) => {
  const [result] = await db.execute('DELETE FROM ai_questions WHERE id = ?', [id]);
  return result.affectedRows > 0;
};

module.exports = { findByUserCode, findActiveByUserCode, findById, create, update, remove };

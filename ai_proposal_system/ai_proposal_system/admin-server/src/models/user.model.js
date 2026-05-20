const db = require('../config/db');

const findAll = async () => {
  const [rows] = await db.execute(
    'SELECT id, user_code, name, phone, email, memo, created_at, updated_at FROM users ORDER BY created_at DESC'
  );
  return rows;
};

const findById = async (id) => {
  const [rows] = await db.execute(
    'SELECT id, user_code, name, phone, email, memo, created_at, updated_at FROM users WHERE id = ?',
    [id]
  );
  return rows[0] || null;
};

const findByUserCode = async (userCode) => {
  const [rows] = await db.execute(
    'SELECT id, user_code, name, phone, email, memo, created_at, updated_at FROM users WHERE user_code = ?',
    [userCode]
  );
  return rows[0] || null;
};

const create = async ({ user_code, name, phone, email, memo }) => {
  const [result] = await db.execute(
    'INSERT INTO users (user_code, name, phone, email, memo) VALUES (?, ?, ?, ?, ?)',
    [user_code, name, phone || null, email || null, memo || null]
  );
  return findById(result.insertId);
};

const update = async (id, { user_code, name, phone, email, memo }) => {
  await db.execute(
    'UPDATE users SET user_code = ?, name = ?, phone = ?, email = ?, memo = ? WHERE id = ?',
    [user_code, name, phone || null, email || null, memo || null, id]
  );
  return findById(id);
};

const remove = async (id) => {
  const [result] = await db.execute('DELETE FROM users WHERE id = ?', [id]);
  return result.affectedRows > 0;
};

module.exports = { findAll, findById, findByUserCode, create, update, remove };

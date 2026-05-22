const db = require('../config/db');
const crypto = require('crypto');

function generateOrderNumber() {
  const date = new Date();
  const ymd = `${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}`;
  const rand = String(Math.floor(Math.random() * 9000) + 1000);
  return `ORDER-${ymd}-${rand}`;
}

function generateAccessCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase(); // 8자리 HEX
}

const OrderModel = {
  async findAll({ page = 1, limit = 20, status, paymentStatus } = {}) {
    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];
    if (status) { conditions.push('o.order_status = ?'); params.push(status); }
    if (paymentStatus) { conditions.push('o.payment_status = ?'); params.push(paymentStatus); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows] = await db.query(
      `SELECT o.*, p.name AS product_name, p.price AS product_price
       FROM orders o
       LEFT JOIN products p ON o.product_id = p.id
       ${where}
       ORDER BY o.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM orders o ${where}`, params
    );
    return { rows, total, page, limit };
  },

  async findById(id) {
    const [rows] = await db.query(
      `SELECT o.*, p.name AS product_name, p.price AS product_price, p.slug AS product_slug
       FROM orders o
       LEFT JOIN products p ON o.product_id = p.id
       WHERE o.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async findByOrderNumber(orderNumber) {
    const [rows] = await db.query(
      `SELECT o.*, p.name AS product_name, p.production_days, p.slug AS product_slug
       FROM orders o
       LEFT JOIN products p ON o.product_id = p.id
       WHERE o.order_number = ?`,
      [orderNumber]
    );
    return rows[0] || null;
  },

  async create(data) {
    const orderNumber = generateOrderNumber();
    const accessCode = generateAccessCode();
    const fields = [
      'order_number','product_id','buyer_name','phone','email',
      'target_name','proposal_date','mood','story',
      'upload_required','request_memo','access_code',
    ];
    const values = [
      orderNumber, data.product_id, data.buyer_name, data.phone, data.email,
      data.target_name || '', data.proposal_date || null,
      data.mood || '', data.story || '',
      data.upload_required ? 1 : 0, data.request_memo || '',
      accessCode,
    ];
    const placeholders = fields.map(() => '?').join(', ');
    const [result] = await db.query(
      `INSERT INTO orders (${fields.join(', ')}) VALUES (${placeholders})`, values
    );
    return this.findById(result.insertId);
  },

  async updateStatus(id, { order_status, payment_status, app_access_enabled, user_code, admin_memo }) {
    const setClauses = [];
    const values = [];
    if (order_status !== undefined) { setClauses.push('order_status = ?'); values.push(order_status); }
    if (payment_status !== undefined) { setClauses.push('payment_status = ?'); values.push(payment_status); }
    if (app_access_enabled !== undefined) { setClauses.push('app_access_enabled = ?'); values.push(app_access_enabled ? 1 : 0); }
    if (user_code !== undefined) { setClauses.push('user_code = ?'); values.push(user_code); }
    if (admin_memo !== undefined) { setClauses.push('admin_memo = ?'); values.push(admin_memo); }
    if (setClauses.length === 0) return this.findById(id);
    values.push(id);
    await db.query(`UPDATE orders SET ${setClauses.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  },

  // Flutter 앱 인증: 주문번호 + 인증코드 검증
  async verifyAccess(orderNumber, accessCode) {
    const [rows] = await db.query(
      `SELECT o.*, p.name AS product_name, p.slug AS product_slug
       FROM orders o
       LEFT JOIN products p ON o.product_id = p.id
       WHERE o.order_number = ? AND o.access_code = ? AND o.app_access_enabled = 1`,
      [orderNumber, accessCode.toUpperCase()]
    );
    return rows[0] || null;
  },
};

module.exports = OrderModel;

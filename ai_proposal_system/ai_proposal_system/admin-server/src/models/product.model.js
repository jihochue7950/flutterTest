const db = require('../config/db');

function parse(row) {
  if (!row) return null;
  try { row.features = JSON.parse(row.features_json || '[]'); } catch { row.features = []; }
  try { row.mood_options = JSON.parse(row.mood_options_json || '[]'); } catch { row.mood_options = []; }
  try { row.detail_images = JSON.parse(row.detail_images_json || '[]'); } catch { row.detail_images = []; }
  return row;
}

const ProductModel = {
  async findAll(activeOnly = true) {
    const where = activeOnly ? 'WHERE is_active = 1' : '';
    const [rows] = await db.query(
      `SELECT * FROM products ${where} ORDER BY sort_order ASC, id ASC`
    );
    return rows.map(parse);
  },

  async findById(id) {
    const [rows] = await db.query('SELECT * FROM products WHERE id = ?', [id]);
    return parse(rows[0] || null);
  },

  async findBySlug(slug) {
    const [rows] = await db.query('SELECT * FROM products WHERE slug = ?', [slug]);
    return parse(rows[0] || null);
  },

  async create(data) {
    const fields = [
      'name','slug','category','tagline','description',
      'features_json','mood_options_json','price','price_label',
      'production_days','thumbnail_url','detail_images_json',
      'sample_scenario','target_audience','how_it_works','is_active','sort_order'
    ];
    const values = [
      data.name, data.slug, data.category || 'proposal',
      data.tagline || '', data.description || '',
      JSON.stringify(data.features || []),
      JSON.stringify(data.mood_options || []),
      data.price || 0,
      data.price_label || '',
      data.production_days || 3,
      data.thumbnail_url || '',
      JSON.stringify(data.detail_images || []),
      data.sample_scenario || '',
      data.target_audience || '',
      data.how_it_works || '',
      data.is_active !== undefined ? data.is_active : 1,
      data.sort_order || 0,
    ];
    const placeholders = fields.map(() => '?').join(', ');
    const [result] = await db.query(
      `INSERT INTO products (${fields.join(', ')}) VALUES (${placeholders})`, values
    );
    return this.findById(result.insertId);
  },

  async update(id, data) {
    const fieldMap = {
      name: data.name, slug: data.slug, category: data.category,
      tagline: data.tagline, description: data.description,
      price: data.price, price_label: data.price_label,
      production_days: data.production_days, thumbnail_url: data.thumbnail_url,
      sample_scenario: data.sample_scenario, target_audience: data.target_audience,
      how_it_works: data.how_it_works, is_active: data.is_active, sort_order: data.sort_order,
    };
    const setClauses = [];
    const values = [];
    for (const [k, v] of Object.entries(fieldMap)) {
      if (v !== undefined) { setClauses.push(`${k} = ?`); values.push(v); }
    }
    if (data.features !== undefined) {
      setClauses.push('features_json = ?');
      values.push(JSON.stringify(data.features));
    }
    if (data.mood_options !== undefined) {
      setClauses.push('mood_options_json = ?');
      values.push(JSON.stringify(data.mood_options));
    }
    if (data.detail_images !== undefined) {
      setClauses.push('detail_images_json = ?');
      values.push(JSON.stringify(data.detail_images));
    }
    if (setClauses.length === 0) return this.findById(id);
    values.push(id);
    await db.query(`UPDATE products SET ${setClauses.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  },

  async remove(id) {
    const [result] = await db.query('DELETE FROM products WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },
};

module.exports = ProductModel;

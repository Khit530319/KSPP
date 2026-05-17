const router = require('express').Router();
const db     = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

/* ─── RAW MATERIALS ─── */

router.get('/raw-materials', async (req, res) => {
  try {
    const { status } = req.query;
    let sql = `SELECT id,code,name,unit,stock_qty,safety_stock,cost_per_unit,
                      expiry_days,storage_temp,status,notes,updated_at
               FROM raw_materials`;
    const params = [];
    if (status) { sql += ' WHERE status=$1'; params.push(status); }
    sql += ' ORDER BY code';
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/raw-materials', authorize('admin','manager'), async (req, res) => {
  try {
    const { code,name,unit,stock_qty,safety_stock,cost_per_unit,
            expiry_days,storage_temp,notes } = req.body;
    const { rows } = await db.query(
      `INSERT INTO raw_materials(code,name,unit,stock_qty,safety_stock,
         cost_per_unit,expiry_days,storage_temp,notes)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [code,name,unit||'กก.',stock_qty||0,safety_stock||0,
       cost_per_unit,expiry_days||3,storage_temp,notes]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/raw-materials/:id', authorize('admin','manager'), async (req, res) => {
  try {
    const { name,unit,stock_qty,safety_stock,cost_per_unit,
            expiry_days,storage_temp,notes } = req.body;
    const status = stock_qty <= 0 ? 'critical'
                 : stock_qty < safety_stock ? 'low' : 'ok';
    const { rows } = await db.query(
      `UPDATE raw_materials SET name=$1,unit=$2,stock_qty=$3,safety_stock=$4,
         cost_per_unit=$5,expiry_days=$6,storage_temp=$7,notes=$8,status=$9
       WHERE id=$10 RETURNING *`,
      [name,unit,stock_qty,safety_stock,cost_per_unit,
       expiry_days,storage_temp,notes,status,req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* ─── PRODUCTS ─── */

router.get('/products', async (req, res) => {
  try {
    const { category, status } = req.query;
    let sql = `SELECT id,code,name_th,name_en,category,net_weight,
                      price,cost,ROUND((price-cost)/NULLIF(price,0)*100,1) AS margin_pct,
                      stock_qty,safety_stock,shelf_days,storage_temp,status,updated_at
               FROM products WHERE 1=1`;
    const params = [];
    if (category) { params.push(category); sql += ` AND category=$${params.length}`; }
    if (status)   { params.push(status);   sql += ` AND status=$${params.length}`; }
    sql += ' ORDER BY code';
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/products', authorize('admin','manager'), async (req, res) => {
  try {
    const { code,name_th,name_en,category,net_weight,price,cost,
            stock_qty,safety_stock,shelf_days,storage_temp,description,status } = req.body;
    const { rows } = await db.query(
      `INSERT INTO products(code,name_th,name_en,category,net_weight,price,cost,
         stock_qty,safety_stock,shelf_days,storage_temp,description,status)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [code,name_th,name_en,category||'fresh',net_weight,price,cost,
       stock_qty||0,safety_stock||0,shelf_days||3,storage_temp,description,status||'active']
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/products/:id', authorize('admin','manager'), async (req, res) => {
  try {
    const { name_th,name_en,category,net_weight,price,cost,
            stock_qty,safety_stock,shelf_days,storage_temp,description,status } = req.body;
    const { rows } = await db.query(
      `UPDATE products SET name_th=$1,name_en=$2,category=$3,net_weight=$4,
         price=$5,cost=$6,stock_qty=$7,safety_stock=$8,shelf_days=$9,
         storage_temp=$10,description=$11,status=$12
       WHERE id=$13 RETURNING *`,
      [name_th,name_en,category,net_weight,price,cost,
       stock_qty,safety_stock,shelf_days,storage_temp,description,status,req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/products/:id', authorize('admin'), async (req, res) => {
  try {
    await db.query('DELETE FROM products WHERE id=$1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

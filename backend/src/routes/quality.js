const router = require('express').Router();
const db     = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

/* ── QC Records ── */
router.get('/qc', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT q.*,
              p.name_th AS product_name,
              w.wo_no,
              u.first_name||' '||u.last_name AS inspector_name
       FROM qc_records q
       LEFT JOIN products p ON p.id=q.product_id
       LEFT JOIN work_orders w ON w.id=q.wo_id
       LEFT JOIN users u ON u.id=q.inspector_id
       ORDER BY q.created_at DESC LIMIT 100`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/qc', authorize('admin','manager','user'), async (req, res) => {
  try {
    const { wo_id,product_id,raw_material_id,sample_weight,temperature,
            color_result,smell_result,texture_result,result,notes } = req.body;

    const { rows: last } = await db.query(
      'SELECT qc_no FROM qc_records ORDER BY created_at DESC LIMIT 1');
    const lastNo = last.length ? parseInt(last[0].qc_no.replace('QC-',''),10) : 1000;
    const qc_no = `QC-${lastNo+1}`;

    const { rows } = await db.query(
      `INSERT INTO qc_records(qc_no,wo_id,product_id,raw_material_id,sample_weight,
         temperature,color_result,smell_result,texture_result,result,inspector_id,notes)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [qc_no,wo_id,product_id,raw_material_id,sample_weight,temperature,
       color_result,smell_result,texture_result,result||'pass',req.user.id,notes]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* ── Loss Records ── */
router.get('/loss', async (req, res) => {
  try {
    const { from_date, to_date, production_line } = req.query;
    let sql = `SELECT lr.*,
                      p.name_th AS product_name,
                      w.wo_no,
                      u.first_name||' '||u.last_name AS recorded_by_name
               FROM loss_records lr
               LEFT JOIN products p ON p.id=lr.product_id
               LEFT JOIN work_orders w ON w.id=lr.wo_id
               LEFT JOIN users u ON u.id=lr.recorded_by
               WHERE 1=1`;
    const params = [];
    if (from_date) { params.push(from_date); sql+=` AND DATE(lr.created_at)>=$${params.length}`; }
    if (to_date)   { params.push(to_date);   sql+=` AND DATE(lr.created_at)<=$${params.length}`; }
    if (production_line) { params.push(production_line); sql+=` AND lr.production_line=$${params.length}`; }
    sql += ' ORDER BY lr.created_at DESC';
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/loss/summary', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        DATE(created_at) AS date,
        SUM(loss_qty) AS total_loss_kg,
        SUM(total_qty) AS total_raw_kg,
        ROUND(AVG(loss_rate),2) AS avg_loss_rate,
        COALESCE(SUM(loss_value),0) AS total_loss_value,
        loss_type,
        production_line
      FROM loss_records
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at), loss_type, production_line
      ORDER BY date DESC`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/loss', authorize('admin','manager','user'), async (req, res) => {
  try {
    const { wo_id,product_id,loss_type,loss_qty,total_qty,loss_value,
            production_line,notes } = req.body;
    const { rows } = await db.query(
      `INSERT INTO loss_records(wo_id,product_id,loss_type,loss_qty,total_qty,
         loss_value,production_line,recorded_by,notes)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [wo_id,product_id,loss_type||'other',loss_qty,total_qty,
       loss_value,production_line,req.user.id,notes]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* ── Shortfalls ── */
router.get('/shortfalls', async (req, res) => {
  try {
    const { status } = req.query;
    let sql = `SELECT sf.*,
                      c.name AS customer_name,
                      p.name_th AS product_name,
                      s.so_no
               FROM shortfall_records sf
               JOIN customers c ON c.id=sf.customer_id
               JOIN products p ON p.id=sf.product_id
               JOIN sales_orders s ON s.id=sf.so_id
               WHERE 1=1`;
    const params = [];
    if (status) { params.push(status); sql+=` AND sf.status=$${params.length}`; }
    sql += ' ORDER BY sf.created_at DESC';
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/shortfalls', authorize('admin','manager'), async (req, res) => {
  try {
    const { so_id,customer_id,product_id,ordered_qty,delivered_qty,cause,status,compensation } = req.body;
    const { rows } = await db.query(
      `INSERT INTO shortfall_records(so_id,customer_id,product_id,ordered_qty,
         delivered_qty,cause,status,compensation,created_by)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [so_id,customer_id,product_id,ordered_qty,delivered_qty,
       cause,status||'pending',compensation,req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/shortfalls/:id', authorize('admin','manager'), async (req, res) => {
  try {
    const { status,compensation,notified_at } = req.body;
    const { rows } = await db.query(
      `UPDATE shortfall_records SET status=COALESCE($1,status),
         compensation=COALESCE($2,compensation),
         notified_at=COALESCE($3,notified_at),
         resolved_at=CASE WHEN $1='resolved' THEN NOW() ELSE resolved_at END
       WHERE id=$4 RETURNING *`,
      [status,compensation,notified_at,req.params.id]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

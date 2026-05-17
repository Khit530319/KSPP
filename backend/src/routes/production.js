const router = require('express').Router();
const db     = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { status, date } = req.query;
    let sql = `SELECT w.id,w.wo_no,w.target_qty,w.produced_qty,w.production_line,
                      w.planned_date,w.started_at,w.completed_at,w.status,w.notes,
                      p.name_th AS product_name,p.code AS product_code,
                      ROUND(w.produced_qty::numeric/NULLIF(w.target_qty,0)*100,1) AS progress_pct
               FROM work_orders w
               JOIN products p ON p.id=w.product_id
               WHERE 1=1`;
    const params = [];
    if (status) { params.push(status); sql += ` AND w.status=$${params.length}`; }
    if (date)   { params.push(date);   sql += ` AND w.planned_date=$${params.length}`; }
    else         { sql += ' AND w.planned_date=CURRENT_DATE'; }
    sql += ' ORDER BY w.production_line,w.created_at';
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authorize('admin','manager'), async (req, res) => {
  try {
    const { product_id,target_qty,production_line,planned_date,notes } = req.body;

    // Auto-generate WO number
    const { rows: last } = await db.query(
      `SELECT wo_no FROM work_orders ORDER BY created_at DESC LIMIT 1`);
    const lastNo = last.length ? parseInt(last[0].wo_no.replace('WO-',''),10) : 0;
    const wo_no = `WO-${String(lastNo+1).padStart(4,'0')}`;

    const { rows } = await db.query(
      `INSERT INTO work_orders(wo_no,product_id,target_qty,production_line,planned_date,
         created_by,notes)
       VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [wo_no,product_id,target_qty,production_line,
       planned_date||new Date().toISOString().slice(0,10),req.user.id,notes]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/:id/progress', authorize('admin','manager','user'), async (req, res) => {
  try {
    const { produced_qty, status } = req.body;
    const updates = [];
    const params  = [];

    if (produced_qty !== undefined) {
      params.push(produced_qty); updates.push(`produced_qty=$${params.length}`);
    }
    if (status) {
      params.push(status); updates.push(`status=$${params.length}`);
      if (status === 'running' && !updates.includes('started_at'))
        updates.push(`started_at=NOW()`);
      if (status === 'done')
        updates.push(`completed_at=NOW()`);
    }
    params.push(req.params.id);
    const { rows } = await db.query(
      `UPDATE work_orders SET ${updates.join(',')} WHERE id=$${params.length} RETURNING *`,
      params
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

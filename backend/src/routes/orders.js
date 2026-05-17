const router = require('express').Router();
const db     = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { status, customer_id, from_date, to_date } = req.query;
    let sql = `SELECT s.id,s.so_no,s.order_date,s.due_date,s.total_amount,s.status,
                      s.notes,c.name AS customer_name,c.code AS customer_code,
                      COUNT(i.id) AS item_count
               FROM sales_orders s
               JOIN customers c ON c.id=s.customer_id
               LEFT JOIN so_items i ON i.so_id=s.id
               WHERE 1=1`;
    const params = [];
    if (status)      { params.push(status);      sql+=` AND s.status=$${params.length}`; }
    if (customer_id) { params.push(customer_id); sql+=` AND s.customer_id=$${params.length}`; }
    if (from_date)   { params.push(from_date);   sql+=` AND s.order_date>=$${params.length}`; }
    if (to_date)     { params.push(to_date);     sql+=` AND s.order_date<=$${params.length}`; }
    sql += ' GROUP BY s.id,c.name,c.code ORDER BY s.created_at DESC';
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const [order, items] = await Promise.all([
      db.query(`SELECT s.*,c.name AS customer_name,c.phone AS customer_phone
                FROM sales_orders s JOIN customers c ON c.id=s.customer_id
                WHERE s.id=$1`, [req.params.id]),
      db.query(`SELECT i.*,p.name_th AS product_name,p.code AS product_code
                FROM so_items i JOIN products p ON p.id=i.product_id
                WHERE i.so_id=$1`, [req.params.id]),
    ]);
    if (!order.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ ...order.rows[0], items: items.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authorize('admin','manager'), async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { customer_id, due_date, notes, items } = req.body;

    const { rows: last } = await client.query(
      'SELECT so_no FROM sales_orders ORDER BY created_at DESC LIMIT 1');
    const lastNo = last.length
      ? parseInt(last[0].so_no.replace('SO-2568-',''), 10) : 0;
    const so_no = `SO-2568-${String(lastNo+1).padStart(4,'0')}`;

    const total = (items||[]).reduce((s,i)=>s+(i.ordered_qty*i.unit_price*(1-((i.discount_pct||0)/100))),0);
    const { rows } = await client.query(
      `INSERT INTO sales_orders(so_no,customer_id,due_date,total_amount,created_by,notes)
       VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
      [so_no,customer_id,due_date,total,req.user.id,notes]
    );
    const soId = rows[0].id;
    for (const item of (items||[])) {
      await client.query(
        `INSERT INTO so_items(so_id,product_id,ordered_qty,unit_price,discount_pct,line_total)
         VALUES($1,$2,$3,$4,$5,$6)`,
        [soId,item.product_id,item.ordered_qty,item.unit_price,
         item.discount_pct||0,
         item.ordered_qty*item.unit_price*(1-((item.discount_pct||0)/100))]
      );
    }
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

router.patch('/:id/status', authorize('admin','manager'), async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['confirmed','preparing','shipped','delivered','cancelled'];
    if (!allowed.includes(status))
      return res.status(400).json({ error: 'Invalid status' });
    const extra = status === 'confirmed' ? `,confirmed_by='${req.user.id}'` : '';
    const { rows } = await db.query(
      `UPDATE sales_orders SET status=$1${extra} WHERE id=$2 RETURNING *`,
      [status, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

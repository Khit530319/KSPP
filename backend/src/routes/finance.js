const router = require('express').Router();
const db     = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

// Middleware: check finance permission from DB
const financeAccess = (moduleKey, action) => async (req, res, next) => {
  try {
    // Check user override first
    const { rows: ov } = await db.query(
      `SELECT can_${action} FROM user_finance_overrides
       WHERE user_id=$1 AND module_key=$2`, [req.user.id, moduleKey]);
    if (ov.length) {
      return ov[0][`can_${action}`] ? next()
        : res.status(403).json({ error: `No ${action} permission on ${moduleKey}` });
    }
    // Fall back to role permission
    const { rows: rp } = await db.query(
      `SELECT can_${action} FROM finance_permissions
       WHERE role=$1 AND module_key=$2`, [req.user.role, moduleKey]);
    if (!rp.length || !rp[0][`can_${action}`])
      return res.status(403).json({ error: `No ${action} permission on ${moduleKey}` });
    next();
  } catch (err) { res.status(500).json({ error: err.message }); }
};

/* ── AP Invoices ── */
router.get('/ap', financeAccess('ap','view'), async (req, res) => {
  try {
    const { status } = req.query;
    let sql = `SELECT a.*,s.name AS supplier_name
               FROM ap_invoices a JOIN suppliers s ON s.id=a.supplier_id WHERE 1=1`;
    const params = [];
    if (status) { params.push(status); sql+=` AND a.status=$${params.length}`; }
    sql += ' ORDER BY a.due_date';
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ap', financeAccess('ap','create'), async (req, res) => {
  try {
    const { invoice_no,supplier_id,grn_id,invoice_date,due_date,
            subtotal,vat_amount,notes } = req.body;
    const total = Number(subtotal||0) + Number(vat_amount||0);
    const { rows } = await db.query(
      `INSERT INTO ap_invoices(invoice_no,supplier_id,grn_id,invoice_date,due_date,
         subtotal,vat_amount,total_amount,notes)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [invoice_no,supplier_id,grn_id,invoice_date,due_date,
       subtotal||0,vat_amount||0,total,notes]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* ── AR Invoices ── */
router.get('/ar', financeAccess('ar','view'), async (req, res) => {
  try {
    const { status } = req.query;
    let sql = `SELECT a.*,c.name AS customer_name
               FROM ar_invoices a JOIN customers c ON c.id=a.customer_id WHERE 1=1`;
    const params = [];
    if (status) { params.push(status); sql+=` AND a.status=$${params.length}`; }
    sql += ' ORDER BY a.due_date';
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ar', financeAccess('ar','create'), async (req, res) => {
  try {
    const { invoice_no,customer_id,so_id,invoice_date,due_date,
            subtotal,vat_amount,notes } = req.body;
    const total = Number(subtotal||0) + Number(vat_amount||0);
    const { rows } = await db.query(
      `INSERT INTO ar_invoices(invoice_no,customer_id,so_id,invoice_date,due_date,
         subtotal,vat_amount,total_amount,notes)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [invoice_no,customer_id,so_id,invoice_date,due_date,
       subtotal||0,vat_amount||0,total,notes]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* ── Payments ── */
router.post('/payments', financeAccess('payment','approve'), async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { payment_type,invoice_id,amount,payment_date,method,bank_name,reference_no } = req.body;

    // Check approval limit
    const { rows: ov } = await client.query(
      `SELECT approval_limit FROM user_finance_overrides WHERE user_id=$1 AND module_key='payment'`,
      [req.user.id]);
    const roleLimit = { admin:9999999, manager:500000, user:50000, viewer:0 };
    const limit = ov.length && ov[0].approval_limit != null
      ? ov[0].approval_limit : roleLimit[req.user.role] || 0;
    if (Number(amount) > limit)
      return res.status(403).json({ error: `Amount exceeds approval limit (${limit.toLocaleString()} บ.)` });

    const { rows: last } = await client.query(
      'SELECT payment_no FROM payments ORDER BY created_at DESC LIMIT 1');
    const lastNo = last.length ? parseInt(last[0].payment_no.replace('PAY-',''),10) : 0;
    const payment_no = `PAY-${String(lastNo+1).padStart(4,'0')}`;

    const { rows } = await client.query(
      `INSERT INTO payments(payment_no,payment_type,invoice_id,amount,payment_date,
         method,bank_name,reference_no,approved_by,created_by)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [payment_no,payment_type,invoice_id,amount,payment_date||new Date().toISOString().slice(0,10),
       method,bank_name,reference_no,req.user.id,req.user.id]
    );

    const table  = payment_type === 'ap' ? 'ap_invoices' : 'ar_invoices';
    await client.query(
      `UPDATE ${table} SET paid_amount=paid_amount+$1,
         status=CASE WHEN paid_amount+$1>=total_amount THEN 'paid'
                     WHEN paid_amount+$1>0 THEN 'partial' ELSE status END
       WHERE id=$2`, [amount, invoice_id]
    );
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

/* ── Finance Summary ── */
router.get('/summary', financeAccess('dashboard_fin','view'), async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        (SELECT COALESCE(SUM(total_amount),0) FROM ar_invoices
         WHERE DATE_TRUNC('month',invoice_date)=DATE_TRUNC('month',NOW())) AS revenue,
        (SELECT COALESCE(SUM(total_amount),0) FROM ap_invoices
         WHERE DATE_TRUNC('month',invoice_date)=DATE_TRUNC('month',NOW())) AS expenses,
        (SELECT COALESCE(SUM(total_amount-paid_amount),0) FROM ap_invoices
         WHERE status IN ('unpaid','partial')) AS ap_outstanding,
        (SELECT COALESCE(SUM(total_amount-paid_amount),0) FROM ar_invoices
         WHERE status IN ('unpaid','partial')) AS ar_outstanding
    `);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* ── Finance Permissions ── */
router.get('/permissions', authorize('admin'), async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM finance_permissions ORDER BY role,module_key');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/permissions', authorize('admin'), async (req, res) => {
  try {
    const { role,module_key,can_view,can_create,can_edit,can_delete,can_approve,can_export } = req.body;
    const { rows } = await db.query(
      `INSERT INTO finance_permissions(role,module_key,can_view,can_create,can_edit,can_delete,can_approve,can_export,updated_by)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT(role,module_key) DO UPDATE SET
         can_view=$3,can_create=$4,can_edit=$5,can_delete=$6,
         can_approve=$7,can_export=$8,updated_by=$9,updated_at=NOW()
       RETURNING *`,
      [role,module_key,can_view,can_create,can_edit,can_delete,can_approve,can_export,req.user.id]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

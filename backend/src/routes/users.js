const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db     = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/', authorize('admin','manager'), async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id,first_name,last_name,email,phone,role,department,
              is_active,last_login_at,created_at
       FROM users ORDER BY role,first_name`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authorize('admin'), async (req, res) => {
  try {
    const { first_name,last_name,email,password,role,department,phone } = req.body;
    if (!first_name||!last_name||!email||!password)
      return res.status(400).json({ error: 'Required fields missing' });
    if (password.length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const hash = await bcrypt.hash(password, 12);
    const { rows } = await db.query(
      `INSERT INTO users(first_name,last_name,email,password_hash,role,department,phone)
       VALUES($1,$2,$3,$4,$5,$6,$7)
       RETURNING id,first_name,last_name,email,role,department,is_active`,
      [first_name,last_name,email.toLowerCase(),hash,role||'user',department,phone]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already exists' });
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authorize('admin'), async (req, res) => {
  try {
    const { first_name,last_name,email,role,department,phone,is_active } = req.body;
    const { rows } = await db.query(
      `UPDATE users SET first_name=$1,last_name=$2,email=$3,role=$4,
         department=$5,phone=$6,is_active=$7
       WHERE id=$8
       RETURNING id,first_name,last_name,email,role,department,is_active`,
      [first_name,last_name,email.toLowerCase(),role,department,phone,is_active,req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/:id/toggle', authorize('admin'), async (req, res) => {
  try {
    if (req.params.id === req.user.id)
      return res.status(400).json({ error: 'Cannot deactivate yourself' });
    const { rows } = await db.query(
      'UPDATE users SET is_active=NOT is_active WHERE id=$1 RETURNING id,is_active',
      [req.params.id]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    if (req.params.id === req.user.id)
      return res.status(400).json({ error: 'Cannot delete yourself' });
    await db.query('DELETE FROM users WHERE id=$1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* Audit log */
router.get('/audit-logs', authorize('admin','manager'), async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT al.*,u.first_name||' '||u.last_name AS user_name,u.role
       FROM audit_logs al LEFT JOIN users u ON u.id=al.user_id
       ORDER BY al.created_at DESC LIMIT 100`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

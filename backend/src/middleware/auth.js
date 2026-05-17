const jwt = require('jsonwebtoken');
const db  = require('../db');

const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer '))
      return res.status(401).json({ error: 'No token provided' });

    const token = header.slice(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { rows } = await db.query(
      'SELECT id,first_name,last_name,email,role,department,is_active FROM users WHERE id=$1',
      [decoded.userId]
    );
    if (!rows.length || !rows[0].is_active)
      return res.status(401).json({ error: 'User not found or inactive' });

    req.user = rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError')
      return res.status(401).json({ error: 'Token expired' });
    res.status(401).json({ error: 'Invalid token' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role))
    return res.status(403).json({ error: 'Insufficient permissions' });
  next();
};

const auditLog = (action, module) => async (req, res, next) => {
  res.on('finish', async () => {
    if (res.statusCode < 400 && req.user) {
      try {
        await db.query(
          `INSERT INTO audit_logs(user_id,action,module,ip_address,user_agent)
           VALUES($1,$2,$3,$4,$5)`,
          [req.user.id, action, module,
           req.ip, req.headers['user-agent']]
        );
      } catch (_) {}
    }
  });
  next();
};

module.exports = { authenticate, authorize, auditLog };

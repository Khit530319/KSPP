require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');
const { createServer } = require('http');
const { WebSocketServer } = require('ws');
const db         = require('./db');

const app = express();

// ── Security middleware ──────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Rate limiting ────────────────────────────────────────────
app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000, max: 20,
  message: { error: 'Too many login attempts' },
}));
app.use('/api', rateLimit({
  windowMs: 60 * 1000, max: 300,
  message: { error: 'Rate limit exceeded' },
}));

// ── Routes ───────────────────────────────────────────────────
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/dashboard',  require('./routes/dashboard'));
app.use('/api/inventory',  require('./routes/inventory'));
app.use('/api/production', require('./routes/production'));
app.use('/api/quality',    require('./routes/quality'));
app.use('/api/orders',     require('./routes/orders'));
app.use('/api/finance',    require('./routes/finance'));
app.use('/api/users',      require('./routes/users'));
app.use('/api/imports',    require('./routes/imports'));

// Customers & Suppliers (lightweight inline)
app.get('/api/customers', require('./middleware/auth').authenticate, async (req, res) => {
  const { rows } = await db.query('SELECT * FROM customers WHERE is_active=true ORDER BY name');
  res.json(rows);
});
app.get('/api/suppliers', require('./middleware/auth').authenticate, async (req, res) => {
  const { rows } = await db.query('SELECT * FROM suppliers WHERE is_active=true ORDER BY name');
  res.json(rows);
});

// Cold room (log + latest)
app.get('/api/cold-room', require('./middleware/auth').authenticate, async (req, res) => {
  const { rows } = await db.query(
    `SELECT DISTINCT ON (room_name) room_name,temperature,humidity,capacity_pct,is_alert,recorded_at
     FROM cold_room_logs ORDER BY room_name,recorded_at DESC`
  );
  res.json(rows);
});
app.post('/api/cold-room', require('./middleware/auth').authenticate, async (req, res) => {
  const { room_name,temperature,humidity,capacity_pct } = req.body;
  const is_alert = temperature > 8 || temperature < 0;
  const { rows } = await db.query(
    `INSERT INTO cold_room_logs(room_name,temperature,humidity,capacity_pct,is_alert)
     VALUES($1,$2,$3,$4,$5) RETURNING *`,
    [room_name,temperature,humidity,capacity_pct,is_alert]
  );
  res.json(rows[0]);
});

// ── Health check ─────────────────────────────────────────────
app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', ts: new Date() });
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// ── WebSocket — real-time alerts ─────────────────────────────
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

const broadcast = (data) => {
  wss.clients.forEach(client => {
    if (client.readyState === 1)
      client.send(JSON.stringify(data));
  });
};

wss.on('connection', (ws) => {
  console.log('WS client connected');
  ws.send(JSON.stringify({ type: 'welcome', message: 'FreshCut ERP realtime' }));

  // Heartbeat
  const ping = setInterval(() => {
    if (ws.readyState === 1) ws.ping();
  }, 30000);
  ws.on('close', () => clearInterval(ping));
});

// Broadcast critical stock alert every 5 min
setInterval(async () => {
  try {
    const { rows } = await db.query(
      `SELECT code,name,stock_qty,safety_stock,status
       FROM raw_materials WHERE status IN ('low','critical')`
    );
    if (rows.length) broadcast({ type: 'stock_alert', items: rows });
  } catch (_) {}
}, 5 * 60 * 1000);

// ── Start ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`\n🌿 FreshCut ERP Backend running on port ${PORT}`);
  console.log(`   ENV:  ${process.env.NODE_ENV || 'development'}`);
  console.log(`   DB:   ${process.env.DATABASE_URL ? '✓ configured' : '✗ DATABASE_URL missing'}`);
  console.log(`   Docs: http://localhost:${PORT}/health\n`);
});

module.exports = { app, broadcast };

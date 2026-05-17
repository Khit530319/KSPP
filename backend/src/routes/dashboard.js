const router = require('express').Router();
const db     = require('../db');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

/* GET /api/dashboard */
router.get('/', async (req, res) => {
  try {
    const [prod, orders, coldRoom, lossRate, fillRate, lowStock, alerts] = await Promise.all([

      // Today production
      db.query(`SELECT COALESCE(SUM(produced_qty),0) AS total_produced,
                       COUNT(*) FILTER(WHERE status='done') AS completed,
                       COUNT(*) FILTER(WHERE status='running') AS running
                FROM work_orders WHERE planned_date=CURRENT_DATE`),

      // Pending orders
      db.query(`SELECT COUNT(*) AS pending_orders,
                       COALESCE(SUM(total_amount),0) AS pending_value
                FROM sales_orders WHERE status IN ('confirmed','preparing')`),

      // Cold room latest readings
      db.query(`SELECT DISTINCT ON (room_name) room_name, temperature, is_alert, recorded_at
                FROM cold_room_logs ORDER BY room_name, recorded_at DESC`),

      // Today loss rate
      db.query(`SELECT COALESCE(AVG(loss_rate),0) AS avg_loss_rate,
                       COALESCE(SUM(loss_qty),0) AS total_loss_kg
                FROM loss_records WHERE DATE(created_at)=CURRENT_DATE`),

      // This month fill rate
      db.query(`SELECT COALESCE(AVG(fill_rate),0) AS avg_fill_rate,
                       COUNT(*) FILTER(WHERE status='urgent') AS urgent_count
                FROM shortfall_records
                WHERE DATE_TRUNC('month',created_at)=DATE_TRUNC('month',NOW())`),

      // Low stock raw materials
      db.query(`SELECT code,name,stock_qty,safety_stock,status
                FROM raw_materials WHERE status IN ('low','critical')
                ORDER BY (stock_qty/NULLIF(safety_stock,0)) LIMIT 5`),

      // Pending alerts
      db.query(`SELECT so_no,c.name AS customer,total_amount,status
                FROM sales_orders s JOIN customers c ON c.id=s.customer_id
                WHERE s.status IN ('confirmed','preparing') AND s.due_date<=CURRENT_DATE+2
                ORDER BY s.due_date LIMIT 5`),
    ]);

    res.json({
      production: {
        todayKg:   Number(prod.rows[0].total_produced),
        completed: Number(prod.rows[0].completed),
        running:   Number(prod.rows[0].running),
      },
      orders: {
        pending:      Number(orders.rows[0].pending_orders),
        pendingValue: Number(orders.rows[0].pending_value),
      },
      coldRoom:   coldRoom.rows,
      lossRate: {
        avgPct: Number(lossRate.rows[0].avg_loss_rate).toFixed(1),
        totalKg: Number(lossRate.rows[0].total_loss_kg),
      },
      fillRate: {
        avgPct:      Number(fillRate.rows[0].avg_fill_rate).toFixed(1),
        urgentCount: Number(fillRate.rows[0].urgent_count),
      },
      lowStock: lowStock.rows,
      alerts:   alerts.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

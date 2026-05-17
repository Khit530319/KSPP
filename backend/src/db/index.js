const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected DB client error', err);
});

const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const dur = Date.now() - start;
    if (process.env.NODE_ENV !== 'production') {
      console.log('query', { text: text.substring(0, 80), dur, rows: res.rowCount });
    }
    return res;
  } catch (err) {
    console.error('DB query error:', err.message, '\nSQL:', text);
    throw err;
  }
};

const getClient = () => pool.connect();

module.exports = { query, getClient, pool };

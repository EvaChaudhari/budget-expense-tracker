import mysql from 'mysql2/promise.js';

const pool = mysql.createPool({
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? 'ledgr',
  password: process.env.DB_PASSWORD ?? process.env.DB_PASS ?? 'ledgr_password',
  database: process.env.DB_NAME ?? 'ledgr',
  waitForConnections: true,
  connectionLimit: 10,
  timezone: '+00:00',
  decimalNumbers: true, // return DECIMAL columns as JS numbers, not strings
  dateStrings: true, // return DATE/DATETIME columns as 'YYYY-MM-DD' strings, not Date objects
});

pool.pool.on('error', (err: Error) => {
  console.error('Unexpected MySQL pool error:', err);
});

export default pool;

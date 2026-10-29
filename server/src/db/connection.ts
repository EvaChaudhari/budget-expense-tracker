import mysql from 'mysql2/promise.js';

const pool = mysql.createPool({
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? 'ledgr',
  password: process.env.DB_PASSWORD ?? 'ledgr_password',
  database: process.env.DB_NAME ?? 'ledgr',
  waitForConnections: true,
  connectionLimit: 10,
  timezone: '+00:00',
  decimalNumbers: true, // return DECIMAL columns as JS numbers, not strings
  dateStrings: true, // return DATE/DATETIME columns as 'YYYY-MM-DD' strings, not Date objects
});

export default pool;

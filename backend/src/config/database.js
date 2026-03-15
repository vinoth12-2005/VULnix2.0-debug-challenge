const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'debug_arena',
  waitForConnections: true,
  connectionLimit: 100, // Handle higher concurrent load
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 1000,
});

module.exports = pool;

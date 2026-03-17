const mysql = require('mysql2/promise');

// In cloud environments (Railway/Vercel), env vars are usually pre-injected.
require('dotenv').config(); 

// Railway provides both custom names and default MYSQLHOST names
const host = process.env.MYSQLHOST || process.env.DB_HOST || 'localhost';
const isRemoteDB = !['localhost', '127.0.0.1', '::1'].includes(host);

const pool = mysql.createPool({
  host: host,
  port: parseInt(process.env.MYSQLPORT || process.env.DB_PORT) || 3306,
  user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
  password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || 'root',
  database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'railway',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 15000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  // Railway requires SSL for remote connections
  ssl: isRemoteDB ? { rejectUnauthorized: false } : undefined,
});

module.exports = pool;

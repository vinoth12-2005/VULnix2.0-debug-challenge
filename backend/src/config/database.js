const mysql = require('mysql2/promise');

// In cloud environments (Railway/Vercel), env vars are usually pre-injected.
// Local dotenv is already loaded in server.js or api/index.js.
require('dotenv').config(); 

const isRemoteDB = !['localhost', '127.0.0.1', '::1'].includes(process.env.DB_HOST || 'localhost');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'railway',
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  connectTimeout: 10000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  // Railway/cloud providers always need SSL — even in local dev when pointing at a remote host
  ssl: isRemoteDB ? { rejectUnauthorized: false } : undefined,
});

module.exports = pool;

const mysql = require('mysql2/promise');

// In cloud environments (Railway/Vercel), env vars are usually pre-injected.
require('dotenv').config(); 

const connectionUri = process.env.DATABASE_URL || process.env.MYSQL_URL;
let pool;

if (connectionUri) {
  const isRemoteDB = !connectionUri.includes('localhost') && !connectionUri.includes('127.0.0.1');
  pool = mysql.createPool({
    uri: connectionUri,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 15000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    ssl: isRemoteDB ? { rejectUnauthorized: false } : undefined,
  });
} else {
  const host = process.env.MYSQLHOST || process.env.DB_HOST || 'localhost';
  const isRemoteDB = !['localhost', '127.0.0.1', '::1'].includes(host);

  pool = mysql.createPool({
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
    ssl: isRemoteDB ? { rejectUnauthorized: false } : undefined,
  });
}

module.exports = pool;

require('dotenv').config();
const { httpServer } = require('./app');
const pool = require('./config/database');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 5000;

async function initializeDatabase() {
  // Use a dedicated single connection for schema init — keep the shared pool free for API requests
  let conn;
  try {
    const isRemoteDB = !['localhost', '127.0.0.1', '::1'].includes(process.env.DB_HOST || 'localhost');
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_NAME || 'railway',
      connectTimeout: 10000,
      ssl: isRemoteDB ? { rejectUnauthorized: false } : undefined,
    });

    const schema = fs.readFileSync(path.join(__dirname, 'config/schema.sql'), 'utf-8');
    const statements = schema.split(';').map(s => s.trim()).filter(Boolean);
    for (const stmt of statements) {
      try { await conn.query(stmt); } catch (_) { /* ignore "already exists" errors */ }
    }
    console.log('✅ Database schema verified');
  } catch (err) {
    console.error('❌ Database init error:', err.message);
    // Don't exit — DB might just be slow; allow server to start and fail gracefully per-request
  } finally {
    if (conn) await conn.end().catch(() => {});
  }
}

async function start() {
  await initializeDatabase();
  httpServer.listen(PORT, () => {
    console.log(`🚀 Debug Arena backend running on http://localhost:${PORT}`);
    console.log(`📡 Socket.io ready`);
  });
}

start();

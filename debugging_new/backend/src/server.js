require('dotenv').config();
const { httpServer } = require('./app');
const pool = require('./config/database');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 5000;

async function initializeDatabase() {
  try {
    const schema = fs.readFileSync(path.join(__dirname, 'config/schema.sql'), 'utf-8');
    const statements = schema.split(';').filter(s => s.trim());
    for (const stmt of statements) {
      if (stmt.trim()) await pool.query(stmt);
    }
    console.log('✅ Database schema verified');
  } catch (err) {
    console.error('❌ Database init error:', err.message);
    process.exit(1);
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

const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'debug_arena',
  });

  console.log('Migrating problems table for Chapter/Round structure...');
  try {
    // 1. Add chapter column
    await pool.execute('ALTER TABLE problems ADD COLUMN chapter INT NOT NULL DEFAULT 1 AFTER id');
    
    // 2. Migrate existing 'round' data to 'chapter' and reset 'round' to 1
    // In our previous version, 'round' was used as Chapter.
    await pool.execute('UPDATE problems SET chapter = round, round = 1');
    
    console.log('Migration successful: chapter column added and data reorganized.');
  } catch (err) {
    if (err.code === 'ER_DUP_COLUMN_NAME') {
      console.log('Chapter column already exists. Skipping addition.');
    } else {
      console.error('Migration failed:', err.message);
    }
  } finally {
    await pool.end();
  }
}

migrate();

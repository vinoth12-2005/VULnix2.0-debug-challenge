/**
 * migrate_anticheat.js
 * Run once: adds anti_cheat_events table, cpp language support,
 * and problem_group_id column to the existing database.
 */
const pool = require('./src/config/database');

async function migrate() {
  const conn = await pool.getConnection();
  try {
    console.log('🔧 Running anti-cheat migration...');

    // 1. Add 'cpp' to the language ENUM in problems table
    try {
      await conn.execute(`
        ALTER TABLE problems
        MODIFY COLUMN language ENUM('python','java','c','cpp') NOT NULL
      `);
      console.log('✅ Added cpp to problems.language ENUM');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME' || e.message.includes('Duplicate')) {
        console.log('ℹ️  cpp already in ENUM (skipped)');
      } else {
        console.warn('⚠️  language ENUM alter:', e.message);
      }
    }

    // 2. Add problem_group_id column to problems
    try {
      await conn.execute(`
        ALTER TABLE problems
        ADD COLUMN problem_group_id INT NULL DEFAULT NULL
      `);
      console.log('✅ Added problem_group_id to problems');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME' || e.message.includes("Duplicate column")) {
        console.log('ℹ️  problem_group_id already exists (skipped)');
      } else {
        console.warn('⚠️  problem_group_id alter:', e.message);
      }
    }

    // 3. Create anti_cheat_events table
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS anti_cheat_events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        team_id INT NOT NULL,
        session_id VARCHAR(255) DEFAULT NULL,
        event_type ENUM(
          'TAB_BLUR','TAB_FOCUS','COPY','PASTE','MASSIVE_PASTE',
          'FULLSCREEN_EXIT','IDLE_TIMEOUT','MULTI_LOGIN_KICK',
          'FAST_SOLVE','RIGHT_CLICK'
        ) NOT NULL,
        metadata JSON DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
        INDEX idx_team_id (team_id),
        INDEX idx_event_type (event_type),
        INDEX idx_created_at (created_at)
      )
    `);
    console.log('✅ anti_cheat_events table ready');

    console.log('\n🎉 Migration complete!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    conn.release();
    process.exit(0);
  }
}

migrate();

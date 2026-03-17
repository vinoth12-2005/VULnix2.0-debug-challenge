const pool = require('./src/config/database');

async function migrate() {
  try {
    console.log('🚀 Running database migration...');
    
    // Check for session_token in teams
    const [teamsColumns] = await pool.execute('SHOW COLUMNS FROM teams LIKE "session_token"');
    if (teamsColumns.length === 0) {
      console.log('➕ Adding session_token column to teams table...');
      await pool.execute('ALTER TABLE teams ADD COLUMN session_token VARCHAR(255) DEFAULT NULL');
    }

    // Check for plain_password in teams (user request from past conversation)
    const [plainColumns] = await pool.execute('SHOW COLUMNS FROM teams LIKE "plain_password"');
    if (plainColumns.length === 0) {
      console.log('➕ Adding plain_password column to teams table...');
      await pool.execute('ALTER TABLE teams ADD COLUMN plain_password VARCHAR(255) DEFAULT NULL');
    }

    // Check for problem_group_id in problems
    const [probColumns] = await pool.execute('SHOW COLUMNS FROM problems LIKE "problem_group_id"');
    if (probColumns.length === 0) {
      console.log('➕ Adding problem_group_id column to problems table...');
      await pool.execute('ALTER TABLE problems ADD COLUMN problem_group_id VARCHAR(50) DEFAULT NULL');
      await pool.execute('ALTER TABLE problems ADD INDEX (problem_group_id)');
    }

    // Create anti_cheat_events if not exists
    console.log('🛡 Ensuring anti_cheat_events table exists...');
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS anti_cheat_events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        team_id INT NOT NULL,
        session_id VARCHAR(255),
        event_type VARCHAR(50) NOT NULL,
        metadata JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
      )
    `);

    // Ensure settings table is seeded
    const [settings] = await pool.execute('SELECT COUNT(*) as count FROM settings');
    if (settings[0].count === 0) {
      console.log('🌱 Seeding default settings...');
      await pool.execute('INSERT INTO settings (id, leaderboard_released) VALUES (1, false)');
    }

    console.log('✅ Migration completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();

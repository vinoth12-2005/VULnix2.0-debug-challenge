const pool = require('./src/config/database');
async function migrate() {
    try {
        try {
            await pool.execute('ALTER TABLE problems ADD COLUMN time_limit INT DEFAULT 0');
            console.log('Added time_limit column');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('time_limit column already exists');
            } else {
                throw err;
            }
        }
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS team_timers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                team_id INT NOT NULL,
                problem_id INT NOT NULL,
                started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ends_at TIMESTAMP NOT NULL,
                FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
                FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE,
                UNIQUE KEY unique_team_problem (team_id, problem_id)
            )
        `);
        console.log('Created team_timers table');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
migrate();

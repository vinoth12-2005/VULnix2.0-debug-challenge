const mysql = require('mysql2/promise');
const fs = require('fs');
const bcrypt = require('bcryptjs');

async function init() {
  console.log("Connecting...");
  try {
    const connection = await mysql.createConnection('mysql://root:zhpURYQhBGrZHghDAbvoUGGliDEiyabk@metro.proxy.rlwy.net:19488/railway');

    console.log("Connected to Railway MySQL!");
    
    // 1. Read schema.sql
    const schemaSql = fs.readFileSync('/home/zoro/Documents/debugging_new/backend/src/config/schema.sql', 'utf8');
    
    // Split statements and filter out USE debug_arena
    const statements = schemaSql
      .replace('CREATE DATABASE IF NOT EXISTS debug_arena;', '')
      .replace('USE debug_arena;', '')
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
      
    // 2. Execute schema statements
    for (const sql of statements) {
      if (sql) {
        // console.log(`Executing: ${sql.substring(0, 50)}...`);
        await connection.execute(sql);
      }
    }
    
    console.log("Schema created successfully.");
    
    // 3. Create default admin if not exists
    const [admins] = await connection.execute('SELECT * FROM admins WHERE username = ?', ['admin']);
    if (admins.length === 0) {
      const passwordHash = await bcrypt.hash('admin123', 10);
      await connection.execute('INSERT INTO admins (username, password_hash) VALUES (?, ?)', ['admin', passwordHash]);
      console.log("Default admin created (admin / admin123)");
    } else {
      console.log("Admin already exists.");
    }
    
    // 4. Create dummy team
    const [teams] = await connection.execute('SELECT * FROM teams WHERE team_name = ?', ['test_team']);
    if (teams.length === 0) {
      await connection.execute('INSERT INTO teams (team_name, plain_password) VALUES (?, ?)', ['test_team', 'testpass']);
      const [newTeam] = await connection.execute('SELECT * FROM teams WHERE team_name = ?', ['test_team']);
      await connection.execute('INSERT INTO scores (team_id, total_points, challenges_completed) VALUES (?, 0, 0)', [newTeam[0].id]);
      console.log("Default team created (test_team)");
    }
    
    await connection.end();
    console.log("Database initialized successfully!");
  } catch (err) {
    console.error("Connection failed:", err);
  }
}

init();

const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
require('dotenv').config();

const teamLogin = async (req, res) => {
  try {
    const { team_name, password } = req.body;
    if (!team_name || !team_name.trim()) {
      return res.status(400).json({ message: 'Team name is required' });
    }

    const [rows] = await pool.execute(
      'SELECT * FROM teams WHERE team_name = ?',
      [team_name.trim()]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Team not found. Please contact the administrator.' });
    }

    const team = rows[0];

    // Verify password if one is set for the team
    if (team.password_hash) {
      if (!password) {
        return res.status(401).json({ message: 'This deity requires a password to manifest.' });
      }
      const valid = await bcrypt.compare(password, team.password_hash);
      if (!valid) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
    }

    // Ensure score row exists
    await pool.execute(
      'INSERT IGNORE INTO scores (team_id, total_points, challenges_completed) VALUES (?, 0, 0)',
      [team.id]
    );

    const sessionToken = crypto.randomBytes(32).toString('hex');

    // Log MULTI_LOGIN_KICK if another session was active
    if (team.session_token && team.session_token !== sessionToken) {
      try {
        await pool.execute(
          'INSERT INTO anti_cheat_events (team_id, session_id, event_type, metadata) VALUES (?, ?, ?, ?)',
          [team.id, team.session_token, 'MULTI_LOGIN_KICK',
           JSON.stringify({ ip: req.ip, user_agent: req.get('User-Agent') || 'unknown' })]
        );
      } catch (_) { /* table may not exist yet on first run */ }
    }

    await pool.execute(
      'UPDATE teams SET session_token = ? WHERE id = ?',
      [sessionToken, team.id]
    );

    const token = jwt.sign(
      { id: team.id, team_name: team.team_name, role: 'team', sessionToken },
      process.env.JWT_SECRET || 'debug_arena_secret_key_2024_cyberpunk',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({ token, team: { id: team.id, team_name: team.team_name }, role: 'team' });
  } catch (err) {
    console.error('Team login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const [rows] = await pool.execute(
      'SELECT * FROM admins WHERE username = ?',
      [username]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const admin = rows[0];
    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username, role: 'admin' },
      process.env.JWT_SECRET || 'debug_arena_secret_key_2024_cyberpunk',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({ token, admin: { id: admin.id, username: admin.username }, role: 'admin' });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const getMe = async (req, res) => {
  res.json({ user: req.user });
};

module.exports = { teamLogin, adminLogin, getMe };

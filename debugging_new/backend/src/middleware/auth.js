const jwt = require('jsonwebtoken');
const pool = require('../config/database');
require('dotenv').config();

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access token required' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    if (decoded.role === 'team' && decoded.sessionToken) {
      const [rows] = await pool.execute('SELECT session_token FROM teams WHERE id = ?', [decoded.id]);
      if (rows.length === 0 || rows[0].session_token !== decoded.sessionToken) {
        return res.status(401).json({ message: 'Logged in from another device. Session expired.' });
      }
    }

    next();
  } catch (err) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

module.exports = { authenticateToken, requireAdmin };

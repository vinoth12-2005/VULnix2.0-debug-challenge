const express = require('express');
const router = express.Router();
const { teamLogin, adminLogin, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const pool = require('../config/database');

router.post('/team-login', teamLogin);
router.post('/admin-login', adminLogin);
router.get('/me', protect, getMe);

// Hidden Debug Route
router.get('/debug-db', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT 1 as connected');
    res.json({ status: 'Connected to Railway Database', data: rows });
  } catch (err) {
    res.status(500).json({ 
      error: 'Database Connection Failed', 
      message: err.message, 
      stack: err.stack,
      env_host: process.env.DB_HOST 
    });
  }
});

module.exports = router;

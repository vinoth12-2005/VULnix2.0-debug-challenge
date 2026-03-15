const express = require('express');
const router = express.Router();
const { teamLogin, adminLogin, getMe } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

router.post('/team-login', teamLogin);
router.post('/admin-login', adminLogin);
router.get('/me', authenticateToken, getMe);

module.exports = router;

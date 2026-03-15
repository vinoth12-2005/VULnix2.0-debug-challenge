const express = require('express');
const router = express.Router();
const { runCode, submitCode } = require('../controllers/codeController');
const { authenticateToken } = require('../middleware/auth');

router.post('/run', authenticateToken, runCode);
router.post('/submit', authenticateToken, submitCode);

module.exports = router;

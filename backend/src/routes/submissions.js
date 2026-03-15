const express = require('express');
const router = express.Router();
const { getSubmissions, getTeamSubmissions, getSolvedProblems } = require('../controllers/submissionController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

router.get('/', authenticateToken, requireAdmin, getSubmissions);
router.get('/my', authenticateToken, getTeamSubmissions);
router.get('/solved', authenticateToken, getSolvedProblems);
router.get('/team/:teamId', authenticateToken, requireAdmin, getTeamSubmissions);

module.exports = router;

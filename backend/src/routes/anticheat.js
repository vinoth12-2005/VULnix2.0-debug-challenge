const express = require('express');
const router = express.Router();
const { logEvent, getEvents, getSummary, getTeamTimeline } = require('../controllers/antiCheatController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Team-authenticated: log an event from the client
router.post('/event', authenticateToken, logEvent);

// Admin-only routes
router.get('/events', authenticateToken, requireAdmin, getEvents);
router.get('/summary', authenticateToken, requireAdmin, getSummary);
router.get('/timeline/:teamId', authenticateToken, requireAdmin, getTeamTimeline);

module.exports = router;

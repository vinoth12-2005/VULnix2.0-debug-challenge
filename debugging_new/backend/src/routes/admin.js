const express = require('express');
const router = express.Router();
const { 
  getTeams, createTeam, deleteTeam, getScores, 
  grantAdmin, resetTeamScore, 
  updateAdminCredentials, updateTeamCredentials,
  updateScore, getSettings, releaseLeaderboard,
  updateSubmissionScore, bulkUploadTeams,
  previewUpload, importFromGoogleSheet, previewGoogleSheet,
  resetTeamTimer
} = require('../controllers/adminController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticateToken, requireAdmin);

router.get('/teams', getTeams);
router.post('/teams', createTeam);
router.delete('/teams/:id', deleteTeam);
router.get('/scores', getScores);
router.post('/grant', grantAdmin);
router.post('/reset/:id', resetTeamScore);
router.put('/credentials', updateAdminCredentials);
router.put('/teams/:id/credentials', updateTeamCredentials);
router.put('/teams/:id/score', updateScore);
router.put('/submissions/:id/score', updateSubmissionScore);
router.post('/teams/upload', upload.single('file'), bulkUploadTeams);
router.post('/teams/preview', upload.single('file'), previewUpload);
router.post('/teams/import-sheet', importFromGoogleSheet);
router.post('/teams/preview-sheet', previewGoogleSheet);
router.delete('/timers/:teamId/:problemId', resetTeamTimer);

router.get('/settings', getSettings);
router.post('/settings/leaderboard', releaseLeaderboard);

module.exports = router;

const express = require('express');
const router = express.Router();
const { getProblems, getProblemById, createProblem, updateProblem, deleteProblem, bulkUpload } = require('../controllers/problemController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

router.get('/', authenticateToken, getProblems);
router.get('/:id', authenticateToken, getProblemById);
router.post('/', authenticateToken, requireAdmin, createProblem);
router.put('/:id', authenticateToken, requireAdmin, updateProblem);
router.delete('/:id', authenticateToken, requireAdmin, deleteProblem);
router.post('/bulk/upload', authenticateToken, requireAdmin, bulkUpload);

module.exports = router;

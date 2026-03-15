const pool = require('../config/database');

const getSubmissions = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT s.id, s.team_id, s.problem_id, s.code, s.result, s.score, s.execution_time, s.submitted_at, t.team_name, p.title, p.language, p.difficulty, p.round
       FROM submissions s
       JOIN teams t ON t.id = s.team_id
       JOIN problems p ON p.id = s.problem_id
       UNION ALL
       SELECT CONCAT('ext-', tt.id) as id, tt.team_id, tt.problem_id, '' as code, 'expired' as result, 0 as score, '' as execution_time, tt.ends_at as submitted_at, t.team_name, p.title, p.language, p.difficulty, p.round
       FROM team_timers tt
       JOIN teams t ON t.id = tt.team_id
       JOIN problems p ON p.id = tt.problem_id
       WHERE tt.ends_at < NOW()
       AND NOT EXISTS (SELECT 1 FROM submissions s2 WHERE s2.team_id = tt.team_id AND s2.problem_id = tt.problem_id)
       ORDER BY submitted_at DESC LIMIT 200`
    );
    res.json(rows);
  } catch (err) {
    console.error('getSubmissions error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const getTeamSubmissions = async (req, res) => {
  try {
    const team_id = req.params.teamId || req.user.id;
    const [rows] = await pool.execute(
      `SELECT s.*, p.title, p.language, p.difficulty, p.round, p.points
       FROM submissions s
       JOIN problems p ON p.id = s.problem_id
       WHERE s.team_id = ?
       ORDER BY s.submitted_at DESC`,
      [team_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getSolvedProblems = async (req, res) => {
  try {
    const team_id = req.user.id;
    const [rows] = await pool.execute(
      `SELECT DISTINCT problem_id FROM submissions WHERE team_id = ? AND result = 'correct'`,
      [team_id]
    );
    res.json(rows.map(r => r.problem_id));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getSubmissions, getTeamSubmissions, getSolvedProblems };

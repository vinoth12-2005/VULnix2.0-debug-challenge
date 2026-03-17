const pool = require('../config/database');

let leaderboardCache = { data: null, lastFetch: 0 };
const CACHE_TTL = 5000; // 5 seconds

const getLeaderboard = async (req, res) => {
  try {
    const now = Date.now();
    if (leaderboardCache.data && (now - leaderboardCache.lastFetch < CACHE_TTL)) {
      return res.json(leaderboardCache.data);
    }

    const [settings] = await pool.execute('SELECT leaderboard_released FROM settings LIMIT 1');
    const isReleased = settings.length > 0 && settings[0].leaderboard_released;

    let rows = [];
    if (isReleased) {
      [rows] = await pool.execute(
        `SELECT t.id, t.team_name, s.total_points, s.challenges_completed,
          RANK() OVER (ORDER BY s.total_points DESC, s.updated_at ASC) as rank_pos
         FROM scores s
         JOIN teams t ON t.id = s.team_id
         ORDER BY rank_pos`
      );
    }
    const response = { released: !!isReleased, data: rows };
    leaderboardCache = { data: response, lastFetch: now };
    res.json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getLeaderboard };

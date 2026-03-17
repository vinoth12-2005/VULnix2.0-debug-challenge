const pool = require('../config/database');

/**
 * POST /api/anticheat/event
 * Team-authenticated route. Logs a single anti-cheat event for the calling team.
 */
const logEvent = async (req, res) => {
  try {
    const { event_type, metadata } = req.body;
    const teamId = req.user.id;
    const sessionId = req.user.sessionToken || null;

    const VALID_TYPES = [
      'TAB_BLUR','TAB_FOCUS','COPY','PASTE','MASSIVE_PASTE',
      'FULLSCREEN_EXIT','IDLE_TIMEOUT','MULTI_LOGIN_KICK',
      'FAST_SOLVE','RIGHT_CLICK'
    ];

    if (!event_type || !VALID_TYPES.includes(event_type)) {
      return res.status(400).json({ message: 'Invalid event_type' });
    }

    await pool.execute(
      'INSERT INTO anti_cheat_events (team_id, session_id, event_type, metadata) VALUES (?, ?, ?, ?)',
      [teamId, sessionId, event_type, metadata ? JSON.stringify(metadata) : null]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('logEvent error:', err);
    // Don't expose error if table doesn't exist yet
    res.json({ ok: true });
  }
};

/**
 * GET /api/anticheat/events?team_id=&event_type=&limit=100
 * Admin route. Returns filtered list of anti-cheat events.
 */
const getEvents = async (req, res) => {
  try {
    const { team_id, event_type, limit = 100 } = req.query;

    let query = `
      SELECT ace.id, ace.team_id, t.team_name, ace.session_id,
             ace.event_type, ace.metadata, ace.created_at
      FROM anti_cheat_events ace
      JOIN teams t ON t.id = ace.team_id
      WHERE 1=1
    `;
    const params = [];

    if (team_id) { query += ' AND ace.team_id = ?'; params.push(team_id); }
    if (event_type) { query += ' AND ace.event_type = ?'; params.push(event_type); }

    query += ' ORDER BY ace.created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (err) {
    console.error('getEvents error:', err.message);
    // If table doesn't exist yet, return empty array
    res.json([]);
  }
};

/**
 * GET /api/anticheat/summary
 * Admin route. Returns per-team event counts and computed suspicion scores.
 */
const getSummary = async (req, res) => {
  try {
    // Get all teams first
    const [teams] = await pool.execute('SELECT id, team_name FROM teams ORDER BY team_name');

    // Try to get anti-cheat events aggregated per team per type
    let eventRows = [];
    try {
      const [rows] = await pool.execute(`
        SELECT team_id, event_type, COUNT(*) as cnt
        FROM anti_cheat_events
        GROUP BY team_id, event_type
      `);
      eventRows = rows;
    } catch (e) {
      console.warn('anti_cheat_events table missing:', e.message);
    }

    // Try to get fast-solve counts (submissions solved very quickly)
    let fastRows = [];
    try {
      const [rows] = await pool.execute(`
        SELECT s.team_id, COUNT(*) as cnt
        FROM submissions s
        JOIN team_timers tt ON tt.team_id = s.team_id AND tt.problem_id = s.problem_id
        WHERE s.result = 'correct'
          AND TIMESTAMPDIFF(SECOND, tt.started_at, s.submitted_at) < 60
        GROUP BY s.team_id
      `);
      fastRows = rows;
    } catch (e) {
      console.warn('fast-solve query failed:', e.message);
    }

    // Build per-team map
    const teamMap = {};
    for (const t of teams) {
      teamMap[t.id] = {
        team_id: t.id,
        team_name: t.team_name,
        events: {},
        suspicion_score: 0,
        risk_level: 'low',
      };
    }

    for (const row of eventRows) {
      if (teamMap[row.team_id]) {
        teamMap[row.team_id].events[row.event_type] = Number(row.cnt);
      }
    }

    for (const row of fastRows) {
      if (teamMap[row.team_id]) {
        teamMap[row.team_id].events['FAST_SOLVE'] = Number(row.cnt);
      }
    }

    // Suspicion score weights
    const WEIGHTS = {
      TAB_BLUR: 3,
      PASTE: 8,
      MASSIVE_PASTE: 15,
      COPY: 2,
      MULTI_LOGIN_KICK: 20,
      FAST_SOLVE: 25,
      FULLSCREEN_EXIT: 5,
      IDLE_TIMEOUT: 1,
      RIGHT_CLICK: 1,
    };

    for (const team of Object.values(teamMap)) {
      let score = 0;
      for (const [type, weight] of Object.entries(WEIGHTS)) {
        score += (team.events[type] || 0) * weight;
      }
      team.suspicion_score = Math.min(100, score);
      team.risk_level = score < 20 ? 'low' : score < 50 ? 'medium' : 'high';
    }

    // Global event counts
    let globalCounts = [];
    try {
      const [rows] = await pool.execute(`
        SELECT event_type, COUNT(*) as total
        FROM anti_cheat_events
        GROUP BY event_type
      `);
      globalCounts = rows;
    } catch (e) { /* table missing */ }

    res.json({
      teams: Object.values(teamMap).sort((a, b) => b.suspicion_score - a.suspicion_score),
      global_event_counts: globalCounts,
    });
  } catch (err) {
    console.error('getSummary error:', err.message);
    res.status(500).json({ message: 'Server error fetching sentinel data' });
  }
};

/**
 * GET /api/anticheat/timeline/:teamId
 * Admin route. Returns chronological timeline of events + submissions for one team.
 */
const getTeamTimeline = async (req, res) => {
  try {
    const { teamId } = req.params;

    const [team] = await pool.execute('SELECT id, team_name FROM teams WHERE id = ?', [teamId]);
    if (!team.length) return res.status(404).json({ message: 'Team not found' });

    // Anti-cheat events
    let events = [];
    try {
      const [rows] = await pool.execute(
        `SELECT 'anticheat' as source, event_type as label, metadata, created_at as timestamp
         FROM anti_cheat_events WHERE team_id = ?
         ORDER BY created_at DESC LIMIT 200`,
        [teamId]
      );
      events = rows;
    } catch (e) { /* table missing */ }

    // Submissions
    let submissions = [];
    try {
      const [rows] = await pool.execute(
        `SELECT 'submission' as source,
                CONCAT(p.title, ' (', s.result, ')') as label,
                JSON_OBJECT('score', s.score, 'result', s.result) as metadata,
                s.submitted_at as timestamp
         FROM submissions s
         JOIN problems p ON p.id = s.problem_id
         WHERE s.team_id = ?
         ORDER BY s.submitted_at DESC LIMIT 100`,
        [teamId]
      );
      submissions = rows;
    } catch (e) {
      console.warn('timeline submissions query failed:', e.message);
    }

    // Merge + sort
    const timeline = [...events, ...submissions].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

    res.json({ team: team[0], timeline });
  } catch (err) {
    console.error('getTeamTimeline error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { logEvent, getEvents, getSummary, getTeamTimeline };

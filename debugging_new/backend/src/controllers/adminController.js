const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const xlsx = require('xlsx');
const https = require('https');
const http = require('http');

const getTeams = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT t.id, t.team_name, t.plain_password as password, t.created_at, s.total_points, s.challenges_completed
       FROM teams t LEFT JOIN scores s ON s.team_id = t.id
       ORDER BY t.created_at`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const createTeam = async (req, res) => {
  try {
    const { team_name, password } = req.body;
    let result;
    if (password && password.trim()) {
      const hash = await bcrypt.hash(password, 10);
      [result] = await pool.execute('INSERT INTO teams (team_name, password_hash, plain_password) VALUES (?, ?, ?)', [team_name, hash, password]);
    } else {
      [result] = await pool.execute('INSERT INTO teams (team_name) VALUES (?)', [team_name]);
    }
    await pool.execute('INSERT INTO scores (team_id) VALUES (?)', [result.insertId]);
    res.status(201).json({ message: 'Team created', id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Team already exists' });
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteTeam = async (req, res) => {
  try {
    await pool.execute('DELETE FROM teams WHERE id = ?', [req.params.id]);
    res.json({ message: 'Team deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getScores = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT t.team_name, s.total_points, s.challenges_completed,
        RANK() OVER (ORDER BY s.total_points DESC) as rank_pos
       FROM scores s JOIN teams t ON t.id = s.team_id
       ORDER BY rank_pos`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const grantAdmin = async (req, res) => {
  try {
    const { username, password } = req.body;
    const hash = await bcrypt.hash(password, 10);
    await pool.execute('INSERT IGNORE INTO admins (username, password_hash) VALUES (?, ?)', [username, hash]);
    res.status(201).json({ message: 'Admin created' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const resetTeamScore = async (req, res) => {
  try {
    await pool.execute('UPDATE scores SET total_points = 0, challenges_completed = 0 WHERE team_id = ?', [req.params.id]);
    await pool.execute('DELETE FROM submissions WHERE team_id = ?', [req.params.id]);
    res.json({ message: 'Score reset' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const updateAdminCredentials = async (req, res) => {
  try {
    const { username, password } = req.body;
    const adminId = req.user.id;
    
    let query = 'UPDATE admins SET username = ?';
    let params = [username];

    if (password && password.trim()) {
      const hash = await bcrypt.hash(password, 10);
      query += ', password_hash = ?';
      params.push(hash);
    }

    query += ' WHERE id = ?';
    params.push(adminId);

    await pool.execute(query, params);
    res.json({ message: 'Divine identity altered successfully.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Username already taken by another deity' });
    res.status(500).json({ message: 'Server error' });
  }
};

const updateTeamCredentials = async (req, res) => {
  try {
    const { team_name, password } = req.body;
    const teamId = req.params.id;

    let query = 'UPDATE teams SET team_name = ?';
    let params = [team_name];

    if (password && password.trim()) {
      const hash = await bcrypt.hash(password, 10);
      query += ', password_hash = ?, plain_password = ?';
      params.push(hash, password);
    }

    query += ' WHERE id = ?';
    params.push(teamId);

    await pool.execute(query, params);
    res.json({ message: 'Identity of the manifest deity updated.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Team name already exists' });
    res.status(500).json({ message: 'Server error' });
  }
};

const updateScore = async (req, res) => {
  try {
    const { total_points, challenges_completed } = req.body;
    const teamId = req.params.id;
    await pool.execute(
      'UPDATE scores SET total_points = ?, challenges_completed = ? WHERE team_id = ?',
      [total_points, challenges_completed, teamId]
    );
    res.json({ message: 'Divine merit updated successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getSettings = async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM settings LIMIT 1');
    res.json(rows[0] || { leaderboard_released: false });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const releaseLeaderboard = async (req, res) => {
  try {
    const { released } = req.body;
    const isReleased = released ? 1 : 0;
    
    const [rows] = await pool.execute('SELECT id FROM settings LIMIT 1');
    if (rows.length === 0) {
      await pool.execute('INSERT INTO settings (leaderboard_released) VALUES (?)', [isReleased]);
    } else {
      await pool.execute('UPDATE settings SET leaderboard_released = ?', [isReleased]);
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('leaderboard_released', released);
      if (released) {
        const [lb] = await pool.execute(
          `SELECT t.id, t.team_name, s.total_points, s.challenges_completed,
            RANK() OVER (ORDER BY s.total_points DESC, s.updated_at ASC) as rank_pos
           FROM scores s JOIN teams t ON t.id = s.team_id
           ORDER BY rank_pos LIMIT 50`
        );
        io.emit('leaderboard_update', lb);
      }
    }
    res.json({ message: `Leaderboard ${released ? 'released' : 'locked'}.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateSubmissionScore = async (req, res) => {
  try {
    const { score } = req.body;
    let submissionId = req.params.id;
    let team_id;

    if (String(submissionId).startsWith('ext-')) {
      const timerId = submissionId.split('-')[1];
      const [timers] = await pool.execute('SELECT team_id, problem_id, ends_at FROM team_timers WHERE id = ?', [timerId]);
      if (timers.length === 0) return res.status(404).json({ message: 'Timer context not found' });
      
      const { team_id: tid, problem_id, ends_at } = timers[0];
      team_id = tid;

      const [existing] = await pool.execute('SELECT id FROM submissions WHERE team_id = ? AND problem_id = ? AND result = "expired"', [team_id, problem_id]);
      
      if (existing.length > 0) {
        submissionId = existing[0].id;
        await pool.execute('UPDATE submissions SET score = ? WHERE id = ?', [score, submissionId]);
      } else {
        const [result] = await pool.execute(
          'INSERT INTO submissions (team_id, problem_id, code, result, score, execution_time, submitted_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [team_id, problem_id, '/* AUTO-SEALED RECORD */', 'expired', score, '0s', ends_at]
        );
        submissionId = result.insertId;
      }
    } else {
      const [submissions] = await pool.execute('SELECT team_id FROM submissions WHERE id = ?', [submissionId]);
      if (submissions.length === 0) return res.status(404).json({ message: 'Submission not found' });
      team_id = submissions[0].team_id;
      await pool.execute('UPDATE submissions SET score = ? WHERE id = ?', [score, submissionId]);
    }

    // Recalculate team's total points and challenges completed
    // points = sum of scores in submissions
    // challenges_completed = count of distinct problem_ids with result='correct' (or non-zero score?)
    // User requested "score will be decided by admin", so total_points should be sum(score).
    const [newScores] = await pool.execute(
      `SELECT SUM(score) as total_points, COUNT(DISTINCT CASE WHEN score > 0 THEN problem_id END) as challenges_completed
       FROM submissions WHERE team_id = ?`,
      [team_id]
    );

    const { total_points, challenges_completed } = newScores[0];

    await pool.execute(
      'UPDATE scores SET total_points = ?, challenges_completed = ? WHERE team_id = ?',
      [total_points || 0, challenges_completed || 0, team_id]
    );

    res.json({ message: 'Submission graded successfully.', total_points, challenges_completed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── Shared helpers ──────────────────────────────────────────────

function parseRowData(row) {
  const teamName = row.team_name || row.Team || row.Name || row.team || row.name || Object.values(row)[0];
  const password  = row.password  || row.Password || row.pass || row.Pass || Object.values(row)[1];
  return { teamName: teamName ? String(teamName).trim() : null, password: password ? String(password) : null };
}

function parseWorkbookRows(buffer) {
  const workbook  = xlsx.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return xlsx.utils.sheet_to_json(worksheet);
}

async function processTeamRows(data) {
  let successCount = 0;
  let errorCount   = 0;
  const results    = [];

  for (const row of data) {
    try {
      const { teamName, password } = parseRowData(row);
      if (!teamName) continue;

      const [existing] = await pool.execute('SELECT id FROM teams WHERE team_name = ?', [teamName]);

      if (existing.length > 0) {
        if (password) {
          const hash = await bcrypt.hash(password, 10);
          await pool.execute('UPDATE teams SET password_hash = ?, plain_password = ? WHERE id = ?', [hash, password, existing[0].id]);
        }
        results.push({ teamName, status: 'updated' });
      } else {
        const [result] = await pool.execute('INSERT INTO teams (team_name) VALUES (?)', [teamName]);
        const teamId = result.insertId;
        if (password) {
          const hash = await bcrypt.hash(password, 10);
          await pool.execute('UPDATE teams SET password_hash = ?, plain_password = ? WHERE id = ?', [hash, password, teamId]);
        }
        await pool.execute('INSERT IGNORE INTO scores (team_id) VALUES (?)', [teamId]);
        results.push({ teamName, status: 'created' });
      }
      successCount++;
    } catch (err) {
      console.error('Error processing row:', row, err);
      errorCount++;
      results.push({ teamName: Object.values(row)[0], status: 'error' });
    }
  }

  return { successCount, errorCount, results };
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const get = (targetUrl, redirectCount = 0) => {
      if (redirectCount > 5) return reject(new Error('Too many redirects'));
      client.get(targetUrl, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return get(res.headers.location, redirectCount + 1);
        }
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      }).on('error', reject);
    };
    get(url);
  });
}

// ── Bulk Upload (existing, refactored) ─────────────────────────

const bulkUploadTeams = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const data = parseWorkbookRows(req.file.buffer);
    if (data.length === 0) return res.status(400).json({ message: 'File is empty' });

    const { successCount, errorCount, results } = await processTeamRows(data);

    res.json({
      message: `Manifestation complete. ${successCount} deities converged. ${errorCount} failed to manifest.`,
      successCount,
      errorCount,
      results
    });
  } catch (err) {
    console.error('Bulk upload error:', err);
    res.status(500).json({ message: err.message || 'Server error during bulk manifestation.' });
  }
};

// ── Preview Upload (parse only, no DB writes) ──────────────────

const previewUpload = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const data = parseWorkbookRows(req.file.buffer);
    if (data.length === 0) return res.status(400).json({ message: 'File is empty' });

    const rows = data.map(row => {
      const { teamName, password } = parseRowData(row);
      return { team_name: teamName || '', has_password: !!password };
    }).filter(r => r.team_name);

    res.json({ rows, total: rows.length });
  } catch (err) {
    console.error('Preview error:', err);
    res.status(500).json({ message: 'Failed to parse file.' });
  }
};

// ── Google Sheet URL import ────────────────────────────────────

const importFromGoogleSheet = async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ message: 'Google Sheet URL is required' });

    // Extract spreadsheet ID from various Google Sheets URL formats
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (!match) return res.status(400).json({ message: 'Invalid Google Sheets URL. Please paste the full sharing link.' });

    const sheetId = match[1];
    const csvUrl  = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;

    let csvBuffer;
    try {
      csvBuffer = await fetchUrl(csvUrl);
    } catch (fetchErr) {
      console.error('Google Sheet fetch error:', fetchErr);
      return res.status(400).json({ message: 'Failed to fetch the Google Sheet. Make sure it is shared as "Anyone with the link can view".' });
    }

    const data = parseWorkbookRows(csvBuffer);
    if (data.length === 0) return res.status(400).json({ message: 'The Google Sheet appears to be empty.' });

    const { successCount, errorCount, results } = await processTeamRows(data);

    res.json({
      message: `Sheet imported. ${successCount} deities converged. ${errorCount} failed to manifest.`,
      successCount,
      errorCount,
      results
    });
  } catch (err) {
    console.error('Google Sheet import error:', err);
    res.status(500).json({ message: err.message || 'Server error during sheet import.' });
  }
};

// ── Google Sheet URL preview (parse only, no DB writes) ────────

const previewGoogleSheet = async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ message: 'Google Sheet URL is required' });

    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (!match) return res.status(400).json({ message: 'Invalid Google Sheets URL.' });

    const sheetId = match[1];
    const csvUrl  = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;

    let csvBuffer;
    try {
      csvBuffer = await fetchUrl(csvUrl);
    } catch (fetchErr) {
      return res.status(400).json({ message: 'Failed to fetch the Google Sheet. Ensure it is publicly shared.' });
    }

    const data = parseWorkbookRows(csvBuffer);
    if (data.length === 0) return res.status(400).json({ message: 'The Google Sheet appears to be empty.' });

    const rows = data.map(row => {
      const { teamName, password } = parseRowData(row);
      return { team_name: teamName || '', has_password: !!password };
    }).filter(r => r.team_name);

    res.json({ rows, total: rows.length });
  } catch (err) {
    console.error('Google Sheet preview error:', err);
    res.status(500).json({ message: err.message || 'Failed to preview sheet.' });
  }
};

const resetTeamTimer = async (req, res) => {
  try {
    const { teamId, problemId } = req.params;
    
    // Delete the timer record
    await pool.execute(
      'DELETE FROM team_timers WHERE team_id = ? AND problem_id = ?',
      [teamId, problemId]
    );

    // Also delete any "expired" submission record so it doesn't count as a sealed block
    await pool.execute(
      'DELETE FROM submissions WHERE team_id = ? AND problem_id = ? AND result = "expired"',
      [teamId, problemId]
    );

    res.json({ message: 'Trial unsealed successfully. The team can now re-attempt the task.' });
  } catch (err) {
    console.error('Reset timer error:', err);
    res.status(500).json({ message: 'Server error during unsealing.' });
  }
};

module.exports = {
  getTeams, createTeam, deleteTeam, getScores,
  grantAdmin, resetTeamScore,
  updateAdminCredentials, updateTeamCredentials,
  updateScore, getSettings, releaseLeaderboard,
  updateSubmissionScore, bulkUploadTeams,
  previewUpload, importFromGoogleSheet, previewGoogleSheet,
  resetTeamTimer
};

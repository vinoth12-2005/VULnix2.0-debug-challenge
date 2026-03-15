const pool = require('../config/database');

const getProblems = async (req, res) => {
  try {
    const { chapter, round, difficulty, language } = req.query;
    let query = 'SELECT * FROM problems WHERE 1=1';
    const params = [];
    if (chapter) { query += ' AND chapter = ?'; params.push(chapter); }
    if (round) { query += ' AND round = ?'; params.push(round); }
    if (difficulty) { query += ' AND difficulty = ?'; params.push(difficulty); }
    if (language) { query += ' AND language = ?'; params.push(language); }
    query += ' ORDER BY chapter, round, difficulty, language';
    const [problems] = await pool.execute(query, params);

    // If regular team is fetching, determine what is locked
    if (req.user.role !== 'admin') {
      const teamId = req.user.id;
      
      const [solvedRows] = await pool.execute(
        'SELECT DISTINCT problem_id FROM submissions WHERE team_id = ? AND result = "correct"',
        [teamId]
      );
      const solvedSet = new Set(solvedRows.map(r => r.problem_id));

      const [expiredRows] = await pool.execute(
        'SELECT problem_id FROM team_timers WHERE team_id = ? AND ends_at < NOW()',
        [teamId]
      );
      const expiredSet = new Set(expiredRows.map(r => r.problem_id));

      const diffRank = { 'easy': 1, 'medium': 2, 'hard': 3 };
      
      const existingBlocks = new Set();
      problems.forEach(p => existingBlocks.add(`${p.chapter}-${p.round}-${p.difficulty}`));

      const sealedBlocks = new Set();
      problems.forEach(p => {
        if (solvedSet.has(p.id) || expiredSet.has(p.id)) {
          sealedBlocks.add(`${p.chapter}-${p.round}-${p.difficulty}`);
        }
      });

      problems.forEach(p => {
        const currentBlockKey = `${p.chapter}-${p.round}-${p.difficulty}`;
        const isSealed = solvedSet.has(p.id) || expiredSet.has(p.id);
        const blockAlreadySealedByOther = !isSealed && sealedBlocks.has(currentBlockKey);

        let prevBlocksNotSealed = false;
        // Check all potential previous blocks
        // This is a bit brute-force but safe since we don't expect 100s of chapters
        for (let c = 1; c <= 10; c++) {
          for (let r = 1; r <= 2; r++) {
            for (const d of ['easy', 'medium', 'hard']) {
              const blockKey = `${c}-${r}-${d}`;
              const isBefore = c < p.chapter || (c === p.chapter && r < p.round) || (c === p.chapter && r === p.round && diffRank[d] < diffRank[p.difficulty]);
              
              if (isBefore && existingBlocks.has(blockKey) && !sealedBlocks.has(blockKey)) {
                prevBlocksNotSealed = true;
                break;
              }
            }
            if (prevBlocksNotSealed) break;
          }
          if (prevBlocksNotSealed) break;
        }

        p.locked = blockAlreadySealedByOther || prevBlocksNotSealed;
        p.sealed = isSealed;
      });
    }

    res.json(problems);
  } catch (err) {
    console.error('getProblems error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const getProblemById = async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM problems WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Problem not found' });
    const problem = rows[0];

    if (req.user.role !== 'admin') {
      const teamId = req.user.id;
      const [solvedRows] = await pool.execute(
        'SELECT DISTINCT problem_id FROM submissions WHERE team_id = ? AND result = "correct"',
        [teamId]
      );
      const [expiredRows] = await pool.execute(
        'SELECT problem_id FROM team_timers WHERE team_id = ? AND ends_at < NOW()',
        [teamId]
      );
      const sealedSet = new Set([
        ...solvedRows.map(r => r.problem_id),
        ...expiredRows.map(r => r.problem_id)
      ]);

      const diffRank = { 'easy': 1, 'medium': 2, 'hard': 3 };
      
      const [blockSealedRows] = await pool.execute(
        `SELECT p.id FROM team_timers tt 
         JOIN problems p ON p.id = tt.problem_id 
         WHERE tt.team_id = ? AND p.chapter = ? AND p.round = ? AND p.difficulty = ? AND tt.ends_at < NOW()`,
        [teamId, problem.chapter, problem.round, problem.difficulty]
      );
      const [blockSolvedRows] = await pool.execute(
        `SELECT p.id FROM submissions s
         JOIN problems p ON p.id = s.problem_id
         WHERE s.team_id = ? AND p.chapter = ? AND p.round = ? AND p.difficulty = ? AND s.result = 'correct'`,
        [teamId, problem.chapter, problem.round, problem.difficulty]
      );
      
      const isSealed = sealedSet.has(problem.id);
      const otherInBlockSealed = !isSealed && (blockSealedRows.length > 0 || blockSolvedRows.length > 0);

      let allPredecessorsSealed = true;
      const diffList = ['easy', 'medium', 'hard'];
      for (let c = 1; c <= 10; c++) {
        for (let r = 1; r <= 2; r++) {
          for (const d of diffList) {
            if (c < problem.chapter || (c === problem.chapter && r < problem.round) || (c === problem.chapter && r === problem.round && diffRank[d] < diffRank[problem.difficulty])) {
              const [existsRows] = await pool.execute('SELECT 1 FROM problems WHERE chapter = ? AND round = ? AND difficulty = ? LIMIT 1', [c, r, d]);
              if (existsRows.length > 0) {
                const [pSealed] = await pool.execute(
                  `SELECT 1 FROM team_timers tt JOIN problems p ON p.id = tt.problem_id WHERE tt.team_id = ? AND p.chapter = ? AND p.round = ? AND p.difficulty = ? AND tt.ends_at < NOW()`,
                  [teamId, c, r, d]
                );
                const [pSolved] = await pool.execute(
                  `SELECT 1 FROM submissions s JOIN problems p ON p.id = s.problem_id WHERE s.team_id = ? AND p.chapter = ? AND p.round = ? AND p.difficulty = ? AND s.result = 'correct'`,
                  [teamId, c, r, d]
                );
                if (pSealed.length === 0 && pSolved.length === 0) {
                  allPredecessorsSealed = false;
                  break;
                }
              }
            }
          }
          if (!allPredecessorsSealed) break;
        }
        if (!allPredecessorsSealed) break;
      }

      if (otherInBlockSealed || !allPredecessorsSealed) {
        return res.status(403).json({ message: 'Trial is locked. Complete previous trials first.' });
      }

      if (problem.time_limit > 0) {
        const started_at = new Date();
        const ends_at = new Date(started_at.getTime() + problem.time_limit * 60000);
        await pool.execute('INSERT IGNORE INTO team_timers (team_id, problem_id, started_at, ends_at) VALUES (?, ?, ?, ?)', [teamId, problem.id, started_at, ends_at]);
        const [timerRows] = await pool.execute('SELECT * FROM team_timers WHERE team_id = ? AND problem_id = ?', [teamId, problem.id]);
        problem.timer = timerRows[0];
      }
    }

    res.json(problem);
  } catch (err) {
    console.error('getProblemById error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const createProblem = async (req, res) => {
  try {
    const { chapter, round, difficulty, language, title, description, buggy_code, expected_output, points, hint, time_limit } = req.body;
    const [result] = await pool.execute(
      'INSERT INTO problems (chapter, round, difficulty, language, title, description, buggy_code, expected_output, points, hint, time_limit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [chapter || 1, round || 1, difficulty, language, title, description, buggy_code, expected_output, points || 10, hint || null, time_limit || 0]
    );
    res.status(201).json({ message: 'Problem created', id: result.insertId });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const updateProblem = async (req, res) => {
  try {
    const { chapter, round, difficulty, language, title, description, buggy_code, expected_output, points, hint, time_limit } = req.body;
    await pool.execute(
      'UPDATE problems SET chapter=?, round=?, difficulty=?, language=?, title=?, description=?, buggy_code=?, expected_output=?, points=?, hint=?, time_limit=? WHERE id=?',
      [chapter, round, difficulty, language, title, description, buggy_code, expected_output, points, hint || null, time_limit || 0, req.params.id]
    );
    res.json({ message: 'Problem updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteProblem = async (req, res) => {
  try {
    await pool.execute('DELETE FROM problems WHERE id = ?', [req.params.id]);
    res.json({ message: 'Problem deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const bulkUpload = async (req, res) => {
  try {
    const problems = req.body.problems;
    if (!Array.isArray(problems)) return res.status(400).json({ message: 'problems must be an array' });
    
    let count = 0;
    for (const p of problems) {
      const title = p.title;
      const description = p.description;
      const buggy_code = p.buggy_code || p.buggyCode;
      const expected_output = p.expected_output || p.expectedOutput;
      const chapter = p.chapter || p.chapterNum || 1;
      const round = p.round || 1;
      const difficulty = p.difficulty || 'easy';
      const language = p.language || 'python';
      const points = p.points || 10;
      const hint = p.hint || null;
      const time_limit = p.time_limit || p.timeLimit || 0;

      const missing = [];
      if (!title) missing.push('title');
      if (!description) missing.push('description');
      if (!buggy_code) missing.push('buggy_code');
      if (!expected_output) missing.push('expected_output');

      if (missing.length > 0) {
        throw new Error(`Problem "${title || 'Untitled'}" is missing required fields: ${missing.join(', ')}`);
      }

      await pool.execute(
        'INSERT INTO problems (chapter, round, difficulty, language, title, description, buggy_code, expected_output, points, hint, time_limit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [chapter, round, difficulty, language, title, description, buggy_code, expected_output, points, hint, time_limit]
      );
      count++;
    }
    res.status(201).json({ message: `${count} problems uploaded successfully.` });
  } catch (err) {
    console.error('bulkUpload error:', err);
    res.status(500).json({ message: err.message || 'Server error during bulk upload.' });
  }
};

module.exports = { getProblems, getProblemById, createProblem, updateProblem, deleteProblem, bulkUpload };

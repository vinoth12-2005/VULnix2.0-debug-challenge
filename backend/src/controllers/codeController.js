const pool = require('../config/database');
const { runInDocker } = require('../utils/dockerRunner');

const runCode = async (req, res) => {
  try {
    const { language, code, problem_id } = req.body;
    if (!language || !code) return res.status(400).json({ message: 'language and code are required' });
    if (!['python', 'java', 'c'].includes(language)) return res.status(400).json({ message: 'Unsupported language' });

    const result = await runInDocker(language, code);

    // If a problem_id is provided, compute bug-fix progress
    if (problem_id) {
      const [problems] = await pool.execute(
        'SELECT expected_output, buggy_code, difficulty FROM problems WHERE id = ?',
        [problem_id]
      );
      if (problems.length > 0) {
        const { expected_output, buggy_code, difficulty } = problems[0];
        const totalBugs = difficulty === 'hard' ? 5 : 3;

        // ── PRIMARY: Line-diff against the original buggy code ───────────────
        // Each problem has exactly N bugs. Count how many buggy lines the
        // student has changed. This works even if code won't compile yet.
        const normLines = (str) =>
          (str || '').split('\n').map(l => l.trim()).filter(l => l.length > 0);

        const originalLines = normLines(buggy_code);
        const studentSet    = new Set(normLines(code));

        let linesFixed = 0;
        for (const origLine of originalLines) {
          if (!studentSet.has(origLine)) linesFixed++;
        }
        // Cap at totalBugs
        const diffBasedFixed = Math.min(totalBugs, linesFixed);

        // ── SECONDARY: Output match (bonus, runs only when code compiled) ────
        // Normalize line-by-line: trim whitespace, drop blank lines
        const normOut = (s) =>
          (s || '').split('\n').map(l => l.trim()).filter(Boolean).join('\n');

        const outputIsCorrect =
          !!result.output && !result.error &&
          normOut(result.output) === normOut(expected_output);

        // ── Decide bugsFixed ─────────────────────────────────────────────────
        // Win = student changed all N bug lines (diff-primary)
        //     OR output perfectly matches expected (output-primary)
        const isCorrect = diffBasedFixed >= totalBugs || outputIsCorrect;
        const bugsFixed = isCorrect ? totalBugs : diffBasedFixed;

        return res.json({ ...result, bugsFixed, totalBugs, isCorrect });
      }
    }

    res.json(result);
  } catch (err) {
    console.error('Run error:', err);
    res.status(500).json({ message: 'Execution error', error: err.message });
  }
};

const submitCode = async (req, res) => {
  try {
    const { problem_id, language, code } = req.body;
    const team_id = req.user.id;

    if (!problem_id || !language || !code) {
      return res.status(400).json({ message: 'problem_id, language, and code are required' });
    }

    // Check if already solved correctly
    const [existing] = await pool.execute(
      'SELECT id FROM submissions WHERE team_id = ? AND problem_id = ? AND result = "correct"',
      [team_id, problem_id]
    );
    if (existing.length > 0) {
      return res.json({ message: 'Already solved!', result: 'already_solved', alreadySolved: true });
    }

    // Get problem
    const [problems] = await pool.execute('SELECT * FROM problems WHERE id = ?', [problem_id]);
    if (!problems.length) return res.status(404).json({ message: 'Problem not found' });
    const problem = problems[0];

    // Check locking status for sequential progression
    const [allProbs] = await pool.execute('SELECT id, chapter, round, difficulty FROM problems');
    // Fetch sealed blocks for this team
    const [solvedBlocksRows] = await pool.execute(
        `SELECT DISTINCT p.chapter, p.round, p.difficulty FROM submissions s 
         JOIN problems p ON p.id = s.problem_id 
         WHERE s.team_id = ? AND s.result = 'correct'`, [team_id]
    );
    const [expiredBlocksRows] = await pool.execute(
        `SELECT DISTINCT p.chapter, p.round, p.difficulty FROM team_timers tt 
         JOIN problems p ON p.id = tt.problem_id 
         WHERE tt.team_id = ? AND tt.ends_at < NOW()`, [team_id]
    );
    
    const sealedBlocks = new Set();
    solvedBlocksRows.forEach(r => sealedBlocks.add(`${r.chapter}-${r.round}-${r.difficulty}`));
    expiredBlocksRows.forEach(r => sealedBlocks.add(`${r.chapter}-${r.round}-${r.difficulty}`));

    const diffRank = { 'easy': 1, 'medium': 2, 'hard': 3 };
    
    // Check if any predecessor block is not sealed
    let predecessorsSealed = true;
    for (let c = 1; c <= 10; c++) {
      for (let r = 1; r <= 2; r++) {
        for (const d of ['easy', 'medium', 'hard']) {
          const isBefore = c < problem.chapter || (c === problem.chapter && r < problem.round) || (c === problem.chapter && r === problem.round && diffRank[d] < diffRank[problem.difficulty]);
          
          if (isBefore) {
            const blockKey = `${c}-${r}-${d}`;
            const isExisting = allProbs.some(ap => ap.chapter === c && ap.round === r && ap.difficulty === d);
            if (isExisting && !sealedBlocks.has(blockKey)) {
              predecessorsSealed = false;
              break;
            }
          }
        }
        if (!predecessorsSealed) break;
      }
      if (!predecessorsSealed) break;
    }

    if (!predecessorsSealed) {
      return res.status(403).json({ message: 'Trial is locked. Complete previous trials first.' });
    }

    // Check if block already sealed by someone else
    const [solvedInThisBlock] = await pool.execute(
        `SELECT s.problem_id FROM submissions s JOIN problems p ON p.id = s.problem_id 
         WHERE s.team_id = ? AND p.chapter = ? AND p.round = ? AND p.difficulty = ? AND s.result = 'correct' LIMIT 1`,
         [team_id, problem.chapter, problem.round, problem.difficulty]
    );
    const [expiredInThisBlock] = await pool.execute(
        `SELECT tt.problem_id FROM team_timers tt JOIN problems p ON p.id = tt.problem_id 
         WHERE tt.team_id = ? AND p.chapter = ? AND p.round = ? AND p.difficulty = ? AND tt.ends_at < NOW() LIMIT 1`,
         [team_id, problem.chapter, problem.round, problem.difficulty]
    );

    if (solvedInThisBlock.length > 0 && solvedInThisBlock[0].problem_id !== problem.id) {
        return res.status(403).json({ message: 'Trial is locked. You already completed another trial in this block.' });
    }
    if (expiredInThisBlock.length > 0 && expiredInThisBlock[0].problem_id !== problem.id) {
        return res.status(403).json({ message: 'Trial is locked. Time expired for another trial in this block.' });
    }

    // Check time limit
    if (problem.time_limit > 0) {
      const [timerRows] = await pool.execute(
        'SELECT ends_at FROM team_timers WHERE team_id = ? AND problem_id = ?',
        [team_id, problem_id]
      );
      if (timerRows.length === 0) {
        return res.status(403).json({ message: 'Task timer has not been started. Please open the problem to start the timer.' });
      }
      if (new Date() > new Date(timerRows[0].ends_at)) {
        return res.status(403).json({ message: 'Time limit expired. This task is sealed.' });
      }
    }

    // Run code
    const execResult = await runInDocker(language, code);

    // ── Correctness: same dual-signal logic as runCode ────────────────────────
    const totalBugs = problem.difficulty === 'hard' ? 5 : 3;

    // 1. Diff-based: count how many original buggy lines the student changed
    const normLines = (str) =>
      (str || '').split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const studentSet = new Set(normLines(code));
    let linesFixed = 0;
    for (const origLine of normLines(problem.buggy_code)) {
      if (!studentSet.has(origLine)) linesFixed++;
    }
    const diffAllFixed = linesFixed >= totalBugs;

    // 2. Output-based: normalize line-by-line and compare
    const normOut = (s) =>
      (s || '').split('\n').map(l => l.trim()).filter(Boolean).join('\n');
    const outputCorrect =
      !!execResult.output && !execResult.error &&
      normOut(execResult.output) === normOut(problem.expected_output);

    const isCorrect = diffAllFixed || outputCorrect;
    const bugsFixed = isCorrect ? totalBugs : Math.min(totalBugs, linesFixed);
    const score = Math.floor((bugsFixed / totalBugs) * problem.points);
    const resultStr = isCorrect ? 'correct' : (execResult.error ? 'error' : 'incorrect');

    // Save submission
    await pool.execute(
      'INSERT INTO submissions (team_id, problem_id, code, result, score, execution_time) VALUES (?, ?, ?, ?, ?, ?)',
      [team_id, problem_id, code, resultStr, score, execResult.executionTime]
    );

    // Recalculate team's total points and challenges completed
    const [newScores] = await pool.execute(
      `SELECT SUM(score) as total_points, COUNT(DISTINCT problem_id) as challenges_completed
       FROM submissions WHERE team_id = ?`,
      [team_id]
    );

    const { total_points, challenges_completed } = newScores[0];

    await pool.execute(
      'UPDATE scores SET total_points = ?, challenges_completed = ? WHERE team_id = ?',
      [total_points || 0, challenges_completed || 0, team_id]
    );

    res.json({
      result: resultStr,
      isCorrect,
      score,
      merit: problem.points,
      output: execResult.output,
      error: execResult.error,
      executionTime: execResult.executionTime,
      expectedOutput: problem.expected_output,
    });
  } catch (err) {
    console.error('Submit error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { runCode, submitCode };

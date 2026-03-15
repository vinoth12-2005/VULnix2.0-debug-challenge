import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Editor from '@monaco-editor/react';

// ─── Confetti particle component ───────────────────────────────────────────
function ConfettiParticle({ style }) {
  return <div className="confetti-particle" style={style} />;
}

function CelebrationOverlay({ onClose, onSeal, sealing }) {
  const colors = ['#d4af37','#8b0000','#00ff88','#ff6b6b','#4ecdc4','#ffe66d','#ff8b94'];
  const shapes = ['circle', 'square', 'triangle'];
  const particles = Array.from({ length: 80 }, (_, i) => ({
    id: i,
    color: colors[i % colors.length],
    shape: shapes[i % shapes.length],
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 1.5}s`,
    duration: `${2.5 + Math.random() * 2}s`,
    size: `${8 + Math.random() * 14}px`,
    rotate: `${Math.random() * 720}deg`,
  }));

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center pointer-events-none"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
    >
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: p.left,
            top: '-20px',
            width: p.size,
            height: p.size,
            backgroundColor: p.shape !== 'triangle' ? p.color : 'transparent',
            borderLeft: p.shape === 'triangle' ? `${parseInt(p.size) / 2}px solid transparent` : undefined,
            borderRight: p.shape === 'triangle' ? `${parseInt(p.size) / 2}px solid transparent` : undefined,
            borderBottom: p.shape === 'triangle' ? `${p.size} solid ${p.color}` : undefined,
            borderRadius: p.shape === 'circle' ? '50%' : p.shape === 'square' ? '2px' : undefined,
            animation: `confettiDrop ${p.duration} ${p.delay} ease-in forwards`,
            transform: `rotate(${p.rotate})`,
          }}
        />
      ))}

      {/* Win card */}
      <div className="relative pointer-events-auto bg-obsidian border-2 border-myth-gold rounded-2xl p-10 text-center max-w-md mx-4 animate-slide-up shadow-[0_0_60px_rgba(212,175,55,0.4)]">
        <div className="text-7xl mb-4 animate-bounce">🎉</div>
        <h2 className="text-4xl font-myth text-myth-gold text-glow-gold tracking-widest mb-2">
          CONGRATULATIONS!
        </h2>
        <p className="text-myth-gold/70 font-body text-sm tracking-widest uppercase mb-6">
          All bugs vanquished! The scroll is pure.
        </p>
        <div className="flex justify-center gap-4 text-3xl mb-8 animate-breathe">
          🎊 🏆 🎊
        </div>
        {/* Two buttons: Seal (primary) and Continue */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onSeal}
            disabled={sealing}
            className="w-full px-8 py-4 bg-myth-gold border-2 border-myth-gold text-obsidian font-myth uppercase tracking-widest rounded-xl hover:bg-myth-gold/90 transition-all font-black text-lg disabled:opacity-60 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(212,175,55,0.5)]"
          >
            {sealing ? (
              <><span className="w-5 h-5 border-2 border-obsidian border-t-transparent rounded-full animate-spin"></span> Sealing...</>
            ) : '🔒 Seal & Submit'}
          </button>
          <button
            onClick={onClose}
            className="w-full px-8 py-3 bg-transparent border border-myth-gold/40 text-myth-gold/70 font-myth uppercase tracking-widest rounded-xl hover:border-myth-gold hover:text-myth-gold transition-all text-sm"
          >
            Review Code First
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Progress feedback bar ─────────────────────────────────────────────────
function BugProgressBar({ bugsFixed, totalBugs }) {
  const pct = Math.round((bugsFixed / totalBugs) * 100);
  const color =
    bugsFixed === totalBugs ? '#00ff88'
    : bugsFixed >= Math.ceil(totalBugs / 2) ? '#d4af37'
    : '#ff4444';

  return (
    <div className="mb-3 px-1">
      <div className="flex justify-between items-center mb-2">
        {/* Big bold label */}
        <div className="flex items-center gap-2">
          <span
            className="text-base font-black uppercase tracking-widest font-myth"
            style={{ color, textShadow: `0 0 12px ${color}99` }}
          >
            Bugs Fixed
          </span>
          {/* Big X/Y pill */}
          <span
            className="text-xl font-black font-myth px-3 py-0.5 rounded-lg border-2"
            style={{
              color,
              borderColor: color,
              background: `${color}18`,
              textShadow: `0 0 10px ${color}`,
              boxShadow: `0 0 10px ${color}40`,
            }}
          >
            {bugsFixed} / {totalBugs}
          </span>
        </div>
        <span
          className="text-sm font-black font-mono"
          style={{ color, textShadow: `0 0 8px ${color}` }}
        >
          {pct}%
        </span>
      </div>
      {/* Thicker glowing bar */}
      <div className="w-full h-4 bg-gray-900 rounded-full overflow-hidden border border-gray-700">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, #8b0000, ${color})`,
            boxShadow: `0 0 16px ${color}80`,
          }}
        />
      </div>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────
export default function Challenge() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [problem, setProblem] = useState(null);
  const [code, setCode] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resultStatus, setResultStatus] = useState(null); // null | 'success' | 'error'
  const [runProgress, setRunProgress] = useState(null);   // { bugsFixed, totalBugs }
  const [showCelebration, setShowCelebration] = useState(false);

  // Timer
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [isTimeUp, setIsTimeUp] = useState(false);

  useEffect(() => {
    const fetchProblem = async () => {
      try {
        const res = await api.get(`/problems/${id}`);
        setProblem(res.data);
        setCode(res.data.buggy_code);
        if (res.data.timer && res.data.time_limit > 0) {
          calculateTimeRemaining(res.data.timer.ends_at);
        }
      } catch (err) {
        if (err.response?.status === 403) {
          alert(err.response.data.message || 'Trial is locked.');
        } else {
          console.error(err);
        }
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchProblem();
  }, [id, navigate]);

  const calculateTimeRemaining = (endsAtStr) => {
    const remain = Math.max(0, Math.floor((new Date(endsAtStr) - Date.now()) / 1000));
    setTimeRemaining(remain);
    if (remain === 0) setIsTimeUp(true);
  };

  useEffect(() => {
    let interval;
    if (problem?.timer && problem.time_limit > 0 && resultStatus !== 'success' && timeRemaining > 0) {
      interval = setInterval(() => {
        const remain = Math.max(0, Math.floor((new Date(problem.timer.ends_at) - Date.now()) / 1000));
        setTimeRemaining(remain);
        if (remain === 0) {
          setIsTimeUp(true);
          clearInterval(interval);
          setOutput(prev => prev + '\n\n⚠️ TIME EXPIRED. THE TASK IS NOW SEALED.');
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [problem, timeRemaining, resultStatus]);

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const handleRun = async () => {
    setRunning(true);
    setResultStatus(null);
    setRunProgress(null);
    setOutput('Invoking spell...\nChanneling...\n');
    try {
      const res = await api.post('/code/run', {
        language: problem.language,
        code,
        problem_id: problem.id,
      });

      const { output: out, error, bugsFixed, totalBugs, isCorrect } = res.data;

      if (bugsFixed !== undefined) {
        setRunProgress({ bugsFixed, totalBugs });

        if (isCorrect || bugsFixed === totalBugs) {
          // All bugs fixed — show celebration and expected output
          setResultStatus('success');
          setShowCelebration(true);
          setOutput(problem.expected_output || out || '');
        } else if (error) {
          // Hide the raw error — just show "Keep Trying"
          setResultStatus('error');
          setOutput('');
        } else if (bugsFixed === 0) {
          setResultStatus('error');
          setOutput('');
        } else {
          // Partial fix — hide raw output, just show progress bar feedback
          setResultStatus(null);
          setOutput('');
        }
      } else {
        // No problem_id comparison — show raw
        setOutput(out || error || 'Incantation dissipated with no effect.');
      }
    } catch (err) {
      setOutput(err.response?.data?.error || err.message);
    } finally {
      setRunning(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setRunProgress(null);
    setOutput('Offering solution to the Heavens...\n');
    try {
      const res = await api.post('/code/submit', {
        problem_id: problem.id,
        language: problem.language,
        code,
      });

      const { data } = res;
      if (data.result === 'correct') {
        setResultStatus('success');
        setShowCelebration(true);
        setOutput(
`✅ DEMON VANQUISHED! [${data.executionTime}]

STATUS: PASSED
MERIT AWARDED: +${data.merit || 0} PTS

Your output is correct!`
        );
      } else if (data.alreadySolved) {
        setResultStatus('success');
        setOutput('✅ You have already vanquished this demon. The celestial seal remains intact.');
      } else {
        setResultStatus('error');
        setOutput(
`❌ SPELL FAILED [${data.executionTime}]

Your Output:
${data.output || data.error}

Expected Destiny:
${data.expectedOutput}`
        );
      }
    } catch (err) {
      setResultStatus('error');
      setOutput(`❌ INCANTATION ERROR\n\n${err.response?.data?.message || err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    if (confirm('Revert the scroll to its corrupted state?')) {
      setCode(problem.buggy_code);
      setOutput('');
      setResultStatus(null);
      setRunProgress(null);
    }
  };

  const feedbackColor =
    resultStatus === 'success' ? 'text-myth-jade'
    : resultStatus === 'error' ? 'text-myth-red'
    : runProgress && runProgress.bugsFixed > 0 ? 'text-myth-gold'
    : 'text-gray-300';

  const feedbackBg =
    resultStatus === 'success' ? 'bg-myth-jade/10 border border-myth-jade/30 rounded'
    : resultStatus === 'error' ? 'bg-myth-red/10 border border-myth-red/30 rounded'
    : runProgress && runProgress.bugsFixed > 0 ? 'bg-myth-gold/5 border border-myth-gold/20 rounded'
    : '';

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-myth-gold font-myth">
      UNROLLING HEAVENLY SCROLL...
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-obsidian overflow-hidden animate-brightness-flicker">
      {/* Confetti inject styles */}
      <style>{`
        @keyframes confettiDrop {
          0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
      `}</style>

      {showCelebration && (
        <CelebrationOverlay
          onClose={() => setShowCelebration(false)}
          onSeal={() => { setShowCelebration(false); handleSubmit(); }}
          sealing={submitting}
        />
      )}

      <div className="cyber-grid opacity-20"></div>

      {/* Top Bar */}
      <header className="h-auto min-h-[3.5rem] border-b border-gray-800 bg-myth-darker flex flex-col md:flex-row items-start md:items-center justify-between px-4 md:px-6 py-2 md:py-0 gap-2">
        <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto overflow-hidden">
          <button onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-myth-gold font-body text-[10px] md:text-sm uppercase transition-colors whitespace-nowrap">
            {'< Return'}
          </button>
          <div className="w-px h-6 bg-gray-800 hidden md:block"></div>
          <h1 className="font-myth font-bold text-gray-200 tracking-widest text-sm md:text-lg truncate">
            {problem.title}{' '}
            <span className={`text-[9px] md:text-xs ml-1 md:ml-2 px-1.5 md:py-0.5 rounded border ${
              problem.difficulty === 'easy' ? 'bg-myth-gold/10 text-myth-gold border-myth-gold/30'
              : problem.difficulty === 'medium' ? 'bg-myth-red/10 text-myth-red border-myth-red/30'
              : 'bg-gray-800 text-gray-400 border-gray-600'
            }`}>{problem.difficulty.toUpperCase()}</span>
          </h1>
        </div>
        <div className="flex gap-4 w-full md:w-auto justify-end items-center">
          {timeRemaining !== null && (
            <div className={`text-[10px] md:text-xs font-bold font-mono px-3 py-1 rounded border flex items-center gap-2 ${
              isTimeUp ? 'bg-myth-red/20 border-myth-red text-myth-red animate-pulse'
              : timeRemaining < 60 ? 'bg-orange-500/20 border-orange-500 text-orange-500 animate-pulse'
              : 'bg-black border-gray-800 text-myth-gold'
            }`}>
              <span>⏱️</span> {isTimeUp ? 'SEALED' : formatTime(timeRemaining)}
            </div>
          )}
          <div className="text-[10px] md:text-xs font-body text-gray-500 uppercase flex items-center bg-black px-2 md:px-3 py-1 rounded border border-gray-800">
            Scripture: <span className="text-myth-gold ml-2 uppercase">{problem.language}</span>
          </div>
          <div className="text-[10px] font-body text-gray-600 bg-black px-2 py-1 rounded border border-gray-800">
            {problem.difficulty === 'hard' ? '5' : '3'} bugs
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Panel */}
        <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-gray-800 bg-myth-dark/40 p-4 md:p-6 overflow-y-auto max-h-[40vh] md:max-h-full flex flex-col">
          <div className="flex-1">
            <h2 className="text-myth-gold/60 font-bold uppercase tracking-widest text-xs mb-4 font-myth">Heavenly Decree</h2>
            <div className="prose prose-invert prose-p:text-gray-300 font-body text-sm leading-relaxed mb-8 whitespace-pre-wrap">
              {problem.description}
            </div>
            <div className="bg-black/50 border border-gray-800 rounded p-4 mb-4">
              <h3 className="text-myth-gold/60 font-bold uppercase tracking-widest text-xs mb-2 font-myth">Expected Destiny</h3>
              <pre className="text-gray-300 font-mono text-sm bg-obsidian rounded p-3 overflow-x-auto shadow-inner border border-gray-900">
                {problem.expected_output}
              </pre>
            </div>
            {problem.hint && (
              <div className="bg-myth-gold/5 border border-myth-gold/20 rounded p-4 mt-8 group cursor-help transition-all hover:bg-myth-gold/10">
                <h3 className="text-myth-gold/80 font-bold uppercase tracking-widest text-xs flex items-center gap-2 font-myth">
                  <span>📜</span> Unveil Secret (Hover)
                </h3>
                <div className="mt-2 text-myth-gold/70 font-body text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                  {problem.hint}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-full md:w-2/3 flex flex-col h-full bg-obsidian overflow-hidden">
          {/* Editor Header */}
          <div className="h-auto md:h-10 border-b border-gray-800 bg-myth-darker flex flex-col md:flex-row justify-between items-center px-4 py-2 md:py-0 gap-2">
            <div className="text-[10px] md:text-xs font-mono text-gray-400 capitalize bg-myth-dark px-3 py-1 rounded md:rounded-t border border-gray-800 md:border-b-0 h-full flex items-center">
              scroll.{problem.language === 'python' ? 'py' : problem.language === 'java' ? 'java' : 'c'}
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              {isTimeUp && resultStatus !== 'success' && (
                <div className="px-3 py-1 rounded bg-myth-red/20 border border-myth-red text-myth-red font-body text-xs flex items-center font-bold tracking-widest mr-2 uppercase">
                  Time Expired
                </div>
              )}
              <button onClick={handleReset} className="flex-1 md:flex-none px-2 md:px-3 py-1 rounded bg-black border border-gray-700 text-gray-400 hover:text-myth-gold hover:border-myth-gold font-body text-[10px] md:text-xs uppercase transition-all">
                Discard
              </button>
              <button
                onClick={handleRun}
                disabled={running || submitting || isTimeUp}
                className="flex-1 md:flex-none px-3 md:px-4 py-1 rounded bg-myth-dark border-b border-gray-600 text-gray-300 font-body text-[10px] md:text-xs uppercase hover:bg-gray-800 transition-all flex items-center justify-center gap-1 md:gap-2 disabled:opacity-50"
              >
                <div className="w-1.5 md:w-2 h-1.5 md:h-2 rounded-full bg-myth-gold"></div> Test
              </button>
              <button
                onClick={handleSubmit}
                disabled={running || submitting || isTimeUp}
                className="flex-1 md:flex-none px-3 md:px-4 py-1 rounded bg-myth-red/20 border-b border-myth-red text-myth-red font-body text-[10px] md:text-xs uppercase font-bold hover:bg-myth-red hover:text-obsidian transition-all disabled:opacity-50 tracking-widest animate-holographic"
              >
                Seal
              </button>
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 border-b border-gray-900 p-2 bg-[#1e1e1e]">
            <Editor
              height="100%"
              language={problem.language}
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 15,
                fontFamily: '"Fira Code", monospace',
                padding: { top: 16 },
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                cursorBlinking: 'smooth',
              }}
            />
          </div>

          {/* Console Area — Divine Mirror */}
          <div className="h-[40vh] md:h-[42%] min-h-[150px] md:min-h-[200px] bg-black flex flex-col shadow-[0_-4px_20px_rgba(0,0,0,0.5)] relative overflow-hidden">
            <div className="scanline opacity-30"></div>
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-myth-gold/40 to-transparent"></div>

            {/* Console Header */}
            <div className="px-6 py-2 border-b border-gray-900 flex justify-between items-center bg-black/80 h-10 flex-shrink-0">
              <span className="text-xs font-myth font-bold uppercase tracking-[0.2em] text-myth-gold/80">Divine Mirror Output</span>
              <div className="flex items-center gap-3">
                {running && <span className="text-xs font-body text-myth-gold animate-pulse">Casting spell...</span>}
                {submitting && <span className="text-xs font-body text-myth-red animate-pulse">Invoking heaven's judgement...</span>}
                {resultStatus === 'success' && !running && !submitting && (
                  <span className="text-xs font-body text-myth-jade animate-pulse">✓ PASSED</span>
                )}
              </div>
            </div>

            {/* Progress bar (only when running test, not submit) */}
            {runProgress && !running && (
              <div className="px-6 pt-3 flex-shrink-0">
                <BugProgressBar bugsFixed={runProgress.bugsFixed} totalBugs={runProgress.totalBugs} />
              </div>
            )}

            {/* Output area */}
            <div className="flex-1 px-6 py-3 overflow-y-auto font-mono text-sm bg-obsidian">
              {output ? (
                <>
                  {/* Big feedback message for "Keep Trying" or "Getting Closer" */}
                  {!running && runProgress && runProgress.bugsFixed < runProgress.totalBugs && resultStatus !== 'success' && (
                    <div className={`mb-3 px-4 py-3 rounded-lg border text-center font-myth tracking-widest uppercase text-sm ${
                      runProgress.bugsFixed === 0
                        ? 'bg-myth-red/10 border-myth-red/40 text-myth-red'
                        : 'bg-myth-gold/10 border-myth-gold/40 text-myth-gold'
                    }`}>
                      {runProgress.bugsFixed === 0
                        ? '🔴  Keep Trying!'
                        : `🟡  You\'re Getting Closer!!! (${runProgress.bugsFixed}/${runProgress.totalBugs})`}
                    </div>
                  )}

                  <pre className={`whitespace-pre-wrap ${feedbackColor} ${feedbackBg} p-2`}>
                    {output}
                  </pre>
                </>
              ) : (
                <div className="text-gray-600 italic">// the mirror is silent...</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

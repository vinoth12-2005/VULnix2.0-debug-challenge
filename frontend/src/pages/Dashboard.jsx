import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';

const LANG_ICONS = { python: '🐍', java: '☕', c: '⚙️' };
const LANG_COLORS = { python: 'myth-gold', java: 'myth-red', c: 'gray-400' };

const CHAPTER_THEMES = {
  1: { label: 'CHAPTER I', subtitle: 'THE SPIRITUAL AWAKENING', tag: 'EASY' },
  2: { label: 'CHAPTER II', subtitle: 'SEVENTY-TWO TRANSFORMATIONS', tag: 'MEDIUM' },
  3: { label: 'CHAPTER III', subtitle: 'THE CELESTIAL ASCENSION', tag: 'HARD' },
};

const ROUND_LABELS = {
  1: { 1: 'Foundation Building', 2: 'Essence Gathering' },
  2: { 1: 'Demon Subduing', 2: 'Cloud Somersault' },
  3: { 1: "Immortal's Trial", 2: 'Divine Breakthrough' },
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ points: 0, completed: 0, rank: '-' });
  const [problems, setProblems] = useState([]);
  const [solvedData, setSolvedData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [probsRes, solvedRes, lbRes] = await Promise.all([
          api.get('/problems'),
          api.get('/submissions/solved'),
          api.get('/leaderboard'),
        ]);
        setProblems(probsRes.data);
        setSolvedData(solvedRes.data);
        const myRank = lbRes.data.find(t => t.id === user.id);
        if (myRank) {
          setStats({ points: myRank.total_points, completed: myRank.challenges_completed, rank: myRank.rank_pos });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    const socket = io('http://localhost:5000');
    socket.on('leaderboard_update', lb => {
      const myRank = lb.find(t => t.team_name === user.team_name);
      if (myRank) setStats(prev => ({ ...prev, rank: myRank.rank_pos }));
    });
    return () => socket.disconnect();
  }, [user]);

  const chapters = Array.from(new Set(problems.map(p => p.chapter))).sort((a, b) => a - b);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-obsidian gap-6">
        <div className="w-16 h-16 border-2 border-myth-gold/30 border-t-myth-gold rounded-full animate-spin"></div>
        <div className="animate-pulse text-myth-gold font-myth tracking-[0.3em] text-2xl text-glow-gold">SUMMONING REALM</div>
        <div className="flex gap-1">
          {[0, 0.2, 0.4].map((d, i) => (
            <div key={i} className="w-2 h-2 bg-myth-gold/50 rounded-full animate-bounce" style={{ animationDelay: `${d}s` }}></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto relative overflow-hidden animate-brightness-flicker">
      {/* Data stream decorations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[2, 12, 25, 42, 58, 72, 88, 96].map((left, i) => (
          <div key={i} className="data-stream" style={{ left: `${left}%`, animationDelay: `${i * 1.5}s`, animationDuration: `${5 + i}s` }}></div>
        ))}
      </div>

      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 border-b border-myth-gold/30 pb-6 relative z-10 animate-slide-up">
        <div>
          <h1 className="text-3xl font-myth font-bold text-gray-200 tracking-widest leading-none group">
            <span className="text-myth-gold">VULNI</span><span className="text-myth-red group-hover:animate-glitch">X</span>{' '}
            <span className="text-myth-gold/70 text-lg">2.0</span>
          </h1>
          <p className="text-gray-400 font-body text-xs uppercase tracking-wider mt-1">
            Reincarnation: <span className="text-myth-jade">Active</span> // Deity:{' '}
            <span className="text-myth-gold">{user.team_name || user.username}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => navigate('/leaderboard')} className="px-4 py-2 border border-myth-gold/50 text-myth-gold hover:bg-myth-gold/10 transition-all rounded font-body uppercase text-xs font-bold">
            Hall of Legends
          </button>
          {user.role === 'admin' && (
            <button onClick={() => navigate('/admin')} className="px-4 py-2 border border-myth-red/50 text-myth-red hover:bg-myth-red/10 transition-all rounded font-body uppercase text-xs font-bold">
              Celestial Court
            </button>
          )}
          <button onClick={logout} className="px-4 py-2 bg-myth-dark text-gray-400 hover:bg-myth-darker hover:text-white transition-all rounded font-body uppercase text-xs border border-gray-800">
            Depart
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 text-center md:text-left">
        {[
          { label: 'Heavenly Rank', value: `#${stats.rank}`, border: 'myth-gold' },
          { label: 'Spiritual Merit', value: stats.points, border: 'myth-red' },
          { label: 'Demons Vanquished', value: `${user.role !== 'admin' ? stats.completed : 0} / ${problems.length}`, border: 'gray-800' },
        ].map((s, i) => (
          <div key={i} className={`bg-myth-dark border border-${s.border}/20 rounded p-6 relative overflow-hidden group hover-lift hover-glow-gold animate-slide-up`} style={{ animationDelay: `${0.1 + i * 0.15}s`, animationFillMode: 'backwards' }}>
            <div className={`absolute inset-0 bg-${s.border}/5 w-0 group-hover:w-full transition-all duration-500 ease-out`}></div>
            <div className={`text-${s.border}/60 text-xs font-bold uppercase tracking-widest mb-1 font-myth`}>{s.label}</div>
            <div className="text-5xl font-myth text-gray-200 text-glow-gold">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Chapters */}
      <div className="space-y-16">
        {chapters.map(chapterNum => {
          const chapterProbs = problems.filter(p => p.chapter === chapterNum);
          if (!chapterProbs.length) return null;
          const theme = CHAPTER_THEMES[chapterNum] || { label: `CHAPTER ${chapterNum}`, subtitle: 'BEYOND THE FRONTIER', tag: '' };
          const rounds = Array.from(new Set(chapterProbs.map(p => p.round))).sort((a, b) => a - b);

          return (
            <div key={chapterNum} className="animate-slide-up" style={{ animationDelay: `${0.1 * chapterNum}s` }}>
              {/* Chapter Header */}
              <div className="flex items-center gap-4 mb-8">
                <div className="h-px bg-gradient-to-r from-transparent via-myth-gold/40 to-transparent flex-1"></div>
                <div className="text-center">
                  <h2 className="text-3xl font-myth tracking-[0.5em] text-myth-gold text-glow-gold uppercase">{theme.label}</h2>
                  <div className="text-[10px] text-myth-gold/50 font-myth tracking-[0.3em] mt-1">{theme.subtitle}</div>
                  <div className="text-[9px] text-myth-red/60 font-body tracking-[0.4em] mt-0.5 border border-myth-red/20 rounded px-2 py-0.5 inline-block">{theme.tag}</div>
                </div>
                <div className="h-px bg-gradient-to-r from-transparent via-myth-gold/40 to-transparent flex-1"></div>
              </div>

              {/* Round Boxes — side by side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {rounds.map(roundNum => {
                  const roundProbs = chapterProbs.filter(p => p.round === roundNum);
                  if (!roundProbs.length) return null;
                  // Sort by language: python, java, c
                  const langOrder = ['python', 'java', 'c'];
                  const sorted = langOrder.map(l => roundProbs.find(p => p.language === l)).filter(Boolean);

                  const roundLabel = ROUND_LABELS[chapterNum]?.[roundNum] || `Round ${roundNum}`;

                  return (
                    <div key={roundNum} className="border border-myth-gold/20 bg-myth-dark/60 rounded-lg p-6 hover-glow-gold transition-all group relative overflow-hidden">
                      {/* Animated border top */}
                      <div className="absolute top-0 left-0 w-full h-[2px] animated-border"></div>

                      {/* Round Header */}
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 border border-myth-gold/40 rounded flex items-center justify-center text-myth-gold font-myth text-sm font-bold animate-corner-pulse">
                          {roundNum}
                        </div>
                        <div>
                          <div className="text-myth-gold font-myth tracking-widest uppercase text-sm">{roundLabel}</div>
                          <div className="text-[9px] text-gray-600 font-body tracking-wider uppercase">Round {roundNum} · {sorted.length} Languages</div>
                        </div>
                        <div className="h-px bg-gradient-to-r from-myth-gold/30 to-transparent flex-1"></div>
                      </div>

                      {/* Language Cards */}
                      <div className="space-y-3">
                        {sorted.map(p => {
                          const solvedEntry = solvedData.find(s => s.problem_id === p.id);
                          const solved = !!solvedEntry;
                          const scoreEarned = solvedEntry ? solvedEntry.score : 0;
                          const isLocked = user.role !== 'admin' && p.locked;
                          const isSealed = user.role !== 'admin' && p.sealed;
                          const langColor = LANG_COLORS[p.language] || 'gray-400';

                          return (
                            <button
                              key={p.id}
                              onClick={() => !isLocked && navigate(`/challenge/${p.id}`)}
                              disabled={isLocked}
                              className={`w-full flex items-center justify-between p-4 rounded-lg border text-left transition-all duration-300 group/btn
                                ${isLocked ? 'opacity-30 cursor-not-allowed border-dashed border-gray-800 bg-myth-dark' : 'hover-lift cursor-pointer'}
                                ${solved
                                  ? 'bg-myth-jade/10 border-myth-jade/40 text-myth-jade'
                                  : isSealed
                                    ? 'bg-myth-red/10 border-myth-red/30 text-myth-red/60'
                                    : !isLocked
                                      ? `bg-obsidian border-${langColor}/20 hover:border-${langColor}/60 hover:bg-${langColor}/5`
                                      : 'text-gray-700 border-transparent'
                                }`}
                            >
                              <div className="flex items-center gap-3">
                                {/* Language badge */}
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg border ${solved ? 'border-myth-jade/30 bg-myth-jade/10' : `border-${langColor}/30 bg-${langColor}/10`} flex-shrink-0`}>
                                  {LANG_ICONS[p.language]}
                                </div>
                                <div>
                                  <div className={`text-xs font-bold uppercase tracking-widest font-myth ${solved ? 'text-myth-jade' : `text-${langColor}`}`}>
                                    {p.language}
                                  </div>
                                  <div className={`text-sm font-body ${solved ? 'text-myth-jade/80' : 'text-gray-300'}`}>{p.title}</div>
                                  <div className="text-[10px] text-gray-600 font-body mt-0.5">
                                    {solved ? (
                                      <span className="text-myth-jade">{scoreEarned} / {p.points} pts</span>
                                    ) : (
                                      <span>{p.points} pts</span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                {solved && <span className="text-[9px] bg-myth-jade/20 text-myth-jade px-2 py-0.5 rounded font-bold tracking-wider border border-myth-jade/30">✓ SOLVED</span>}
                                {isSealed && !solved && <span className="text-[9px] bg-myth-red/20 text-myth-red px-2 py-0.5 rounded font-bold tracking-wider border border-myth-red/30">SEALED</span>}
                                {isLocked && <span className="text-[9px] text-myth-red/50">LOCKED</span>}
                                {!solved && !isSealed && !isLocked && (
                                  <span className={`text-[9px] text-${langColor}/80 group-hover/btn:translate-x-1 transition-transform inline-block`}>→ START</span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

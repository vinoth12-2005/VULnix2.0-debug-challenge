import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function Admin() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('problems');
  
  // Data
  const [problems, setProblems] = useState([]);
  const [teams, setTeams] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  
  // States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Upload
  const [jsonText, setJsonText] = useState('');
  
  // Settings
  const [leaderboardReleased, setLeaderboardReleased] = useState(false);
  
  // New Team
  const [newTeamName, setNewTeamName] = useState('');

  const [editingProblem, setEditingProblem] = useState(null);
  const [editFormData, setEditFormData] = useState({
    title: '', description: '', chapter: 1, round: 1, difficulty: 'easy', 
    language: 'python', buggy_code: '', expected_output: '', 
    points: 10, hint: '', time_limit: 0
  });

  // Admin Self-Update State
  const [adminFormData, setAdminFormData] = useState({ username: '', password: '' });

  // Creation State
  const [isCreatingProblem, setIsCreatingProblem] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    title: '', description: '', chapter: 1, round: 1, difficulty: 'easy', 
    language: 'python', buggy_code: '', expected_output: '', 
    points: 10, hint: '', time_limit: 0
  });

  // Editing Team State
  const [editingTeam, setEditingTeam] = useState(null);
  const [teamEditFormData, setTeamEditFormData] = useState({ team_name: '', password: '', total_points: 0, challenges_completed: 0 });

  // Grading Submission State
  const [gradingSubmission, setGradingSubmission] = useState(null);
  const [submissionScore, setSubmissionScore] = useState(0);

  const fileInputRef = useRef(null);
  const problemFileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  // Fixed-code runner state (for generating expected output)
  const [fixedCode, setFixedCode] = useState('');
  const [fixedCodeRunning, setFixedCodeRunning] = useState(false);
  const [fixedCodeResult, setFixedCodeResult] = useState('');
  const [fixedCodeTarget, setFixedCodeTarget] = useState(null); // 'create' | 'edit'

  // Import UI state
  const [importTab, setImportTab] = useState('file');
  const [sheetUrl, setSheetUrl] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [previewSource, setPreviewSource] = useState(null); // 'file' | 'sheet'
  const [pendingFile, setPendingFile] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pRes, tRes, sRes, setRes] = await Promise.all([
        api.get('/problems'),
        api.get('/admin/teams'),
        api.get('/submissions'),
        api.get('/admin/settings')
      ]);
      setProblems(pRes.data);
      setTeams(tRes.data);
      setSubmissions(sRes.data);
      setLeaderboardReleased(setRes.data.leaderboard_released || false);
    } catch (err) {
      setError('Failed to summon court records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateTeam = async () => {
    try {
      setError(''); setSuccess('');
      const res = await api.post('/admin/teams', { team_name: newTeamName.trim() });
      setSuccess(`Deity '${newTeamName}' has ascended successfully.`);
      setNewTeamName('');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to consecrate deity');
    }
  };

  const handleJsonUpload = async () => {
    try {
      setError(''); setSuccess('');
      const payload = JSON.parse(jsonText);
      const res = await api.post('/problems/bulk/upload', { problems: payload });
      setSuccess(res.data.message);
      setJsonText('');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid heavenly script (JSON format)');
    }
  };

  const handleProblemFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setJsonText(event.target.result);
    };
    reader.readAsText(file);
    if (problemFileInputRef.current) problemFileInputRef.current.value = '';
  };

  const startEditing = (problem) => {
    setEditingProblem(problem.id);
    setEditFormData({
      title: problem.title,
      description: problem.description,
      chapter: problem.chapter,
      round: problem.round,
      difficulty: problem.difficulty,
      language: problem.language,
      buggy_code: problem.buggy_code,
      expected_output: problem.expected_output,
      points: problem.points,
      hint: problem.hint || '',
      time_limit: problem.time_limit || 0
    });
    // Scroll to top of editor section
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateProblem = async (e) => {
    e.preventDefault();
    try {
      setError(''); setSuccess('');
      await api.put(`/problems/${editingProblem}`, editFormData);
      setSuccess('Heavenly scripture updated successfully.');
      setEditingProblem(null);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update scripture');
    }
  };

  const handleCreateProblem = async (e) => {
    e.preventDefault();
    try {
      setError(''); setSuccess('');
      await api.post('/problems', createFormData);
      setSuccess('New heavenly trial has been manifested.');
      setIsCreatingProblem(false);
      setCreateFormData({
        title: '', description: '', chapter: 1, round: 1, difficulty: 'easy', 
        language: 'python', buggy_code: '', expected_output: '', 
        points: 10, hint: '', time_limit: 0
      });
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to manifest trial');
    }
  };

  const handleDeleteProblem = async (id) => {
    if (!confirm('Banish this trial forever?')) return;
    try {
      await api.delete(`/problems/${id}`);
      fetchData();
    } catch (err) {
      setError('Failed to banish trial');
    }
  };

  const handleRunFixedCode = async (targetForm) => {
    const lang = targetForm === 'create' ? createFormData.language : editFormData.language;
    if (!fixedCode.trim()) return;
    setFixedCodeRunning(true);
    setFixedCodeResult('');
    try {
      const res = await api.post('/code/run', { language: lang, code: fixedCode });
      const out = res.data.output || res.data.error || '';
      setFixedCodeResult(out);
      // Auto-fill the expected output field
      if (targetForm === 'create') {
        setCreateFormData(prev => ({ ...prev, expected_output: out.trimEnd() }));
      } else {
        setEditFormData(prev => ({ ...prev, expected_output: out.trimEnd() }));
      }
    } catch (err) {
      setFixedCodeResult('❌ Error running code: ' + (err.response?.data?.error || err.message));
    } finally {
      setFixedCodeRunning(false);
    }
  };

  const handleResetTeam = async (id) => {
    if (!confirm('Strip all merit and deeds from this deity?')) return;
    try {
      await api.post(`/admin/reset/${id}`);
      fetchData();
    } catch (err) {
      setError('Failed to strip merit');
    }
  };

  const handleDeleteTeam = async (id) => {
    if (!confirm('Eradicate this deity entirely?')) return;
    try {
      await api.delete(`/admin/teams/${id}`);
      fetchData();
    } catch (err) {
      setError('Failed to eradicate deity');
    }
  };

  const handleUpdateAdmin = async (e) => {
    e.preventDefault();
    try {
      setError(''); setSuccess('');
      await api.put('/admin/credentials', adminFormData);
      setSuccess('Your divine identity has been permanently altered.');
      setAdminFormData({ username: '', password: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to alter identity');
    }
  };

  const startEditingTeam = (team) => {
    setEditingTeam(team.id);
    setTeamEditFormData({ 
      team_name: team.team_name, 
      password: '',
      total_points: team.total_points || 0,
      challenges_completed: team.challenges_completed || 0
    });
  };

  const handleUpdateTeam = async (e) => {
    e.preventDefault();
    try {
      setError(''); setSuccess('');
      await api.put(`/admin/teams/${editingTeam}/credentials`, { 
        team_name: teamEditFormData.team_name, 
        password: teamEditFormData.password 
      });
      await api.put(`/admin/teams/${editingTeam}/score`, {
        total_points: teamEditFormData.total_points,
        challenges_completed: teamEditFormData.challenges_completed
      });
      setSuccess(`The essence and merit of '${teamEditFormData.team_name}' has been reshaped.`);
      setEditingTeam(null);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reshape deity');
    }
  };

  const handleResetTimer = async (teamId, problemId) => {
    if (!confirm('Unseal this trial? The team will be able to start a fresh attempt.')) return;
    try {
      setError(''); setSuccess('');
      await api.delete(`/admin/timers/${teamId}/${problemId}`);
      setSuccess('Trial successfully unsealed. The heavens offer another chance.');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to unseal trial');
    }
  };

  const handleToggleLeaderboard = async () => {
    try {
      setError(''); setSuccess('');
      const newState = !leaderboardReleased;
      await api.post('/admin/settings/leaderboard', { released: newState });
      setLeaderboardReleased(newState);
      setSuccess(`Leaderboard ${newState ? 'revealed to mortals' : 'hidden from mortal eyes'}.`);
    } catch (err) {
      setError('Failed to alter leaderboard visibility');
    }
  };

  const handleGradeSubmission = async (id) => {
    try {
      setError(''); setSuccess('');
      await api.put(`/admin/submissions/${id}/score`, { score: parseInt(submissionScore) || 0 });
      setSuccess('Decree updated: Trial has been graded.');
      setGradingSubmission(null);
      fetchData();
    } catch (err) {
      setError('Failed to record divine judgement');
    }
  };

  const handleFilePreview = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPendingFile(file);
    const formData = new FormData();
    formData.append('file', file);
    setUploading(true); setError('');
    try {
      const res = await api.post('/admin/teams/preview', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setPreviewData(res.data.rows);
      setPreviewSource('file');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to parse file.');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } finally { setUploading(false); }
  };

  const handleSheetPreview = async () => {
    if (!sheetUrl.trim()) return;
    setUploading(true); setError('');
    try {
      const res = await api.post('/admin/teams/preview-sheet', { url: sheetUrl });
      setPreviewData(res.data.rows);
      setPreviewSource('sheet');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch Google Sheet.');
    } finally { setUploading(false); }
  };

  const handleConfirmImport = async () => {
    setUploading(true); setError(''); setSuccess('');
    try {
      let res;
      if (previewSource === 'file' && pendingFile) {
        const formData = new FormData();
        formData.append('file', pendingFile);
        res = await api.post('/admin/teams/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        res = await api.post('/admin/teams/import-sheet', { url: sheetUrl });
      }
      setSuccess(res.data.message);
      setPreviewData(null); setPreviewSource(null); setPendingFile(null); setSheetUrl('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Import failed.');
    } finally { setUploading(false); }
  };

  const cancelPreview = () => {
    setPreviewData(null); setPreviewSource(null); setPendingFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (loading && problems.length === 0) return <div className="min-h-screen text-myth-gold flex items-center justify-center font-myth text-2xl animate-pulse">SUMMONING_COURT()</div>;

  return (
    <div className="min-h-screen bg-obsidian p-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 border-b border-gray-800 pb-6">
        <div>
          <h1 className="text-3xl font-myth font-bold text-gray-200 flex items-center gap-3">
            <span className="text-myth-gold">VULNI</span><span className="text-myth-red">X</span> <span className="text-myth-gold/60 text-xl">ADMIN</span>
          </h1>
          <p className="text-gray-500 font-body text-[10px] md:text-xs uppercase mt-2">Authority Level: Jade Emperor // Divine Decree Confirmed</p>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <button onClick={() => navigate('/dashboard')} className="flex-1 md:flex-none px-4 py-2 border border-gray-600 text-gray-400 hover:text-white rounded font-body uppercase text-xs">Mortal Realm</button>
          <button onClick={logout} className="flex-1 md:flex-none px-4 py-2 bg-myth-red/20 border border-myth-red text-myth-red rounded font-body uppercase text-xs shadow-[0_0_10px_rgba(139,0,0,0.2)] hover:bg-myth-red hover:text-obsidian transition-colors">Abdicate</button>
        </div>
      </header>

      {error && <div className="bg-myth-red/20 border border-myth-red text-myth-red p-3 rounded mb-6 font-body text-sm font-bold flex gap-2"><span>⚔️</span> {error}</div>}
      {success && <div className="bg-myth-jade/20 border border-myth-jade text-myth-jade p-3 rounded mb-6 font-body text-sm font-bold flex gap-2"><span>✨</span> {success}</div>}

      <div className="flex border-b border-gray-800 mb-6 flex-wrap gap-y-2">
        {['trials', 'deities', 'deeds', 'sovereignty'].map((tab, idx) => {
          const actualTab = ['problems', 'teams', 'submissions', 'sovereignty'][idx];
          return (
            <button
              key={actualTab}
              onClick={() => setActiveTab(actualTab)}
              className={`flex-1 md:flex-none px-4 md:px-6 py-3 font-myth uppercase font-bold text-xs md:text-sm tracking-widest transition-colors ${
                activeTab === actualTab 
                  ? 'text-myth-red border-b-2 border-myth-red text-glow-red' 
                  : 'text-gray-500 hover:text-myth-gold'
              }`}
            >
              {tab}
            </button>
          )
        })}
        <div className="ml-auto my-auto pr-4">
          <button 
            onClick={handleToggleLeaderboard}
            className={`px-4 py-2 text-xs font-bold uppercase rounded border transition-colors ${
              leaderboardReleased 
                ? 'bg-myth-jade/20 border-myth-jade text-myth-jade hover:bg-myth-jade hover:text-obsidian shadow-[0_0_10px_rgba(0,255,127,0.2)]'
                : 'bg-myth-red/20 border-myth-red text-myth-red hover:bg-myth-red hover:text-obsidian shadow-[0_0_10px_rgba(139,0,0,0.2)]'
            }`}
          >
            {leaderboardReleased ? '👁️ Leaderboard: Revealed' : '🔒 Leaderboard: Hidden'}
          </button>
        </div>
      </div>

      {activeTab === 'problems' && (
        <div className="space-y-8">
          {!editingProblem && !isCreatingProblem && (
            <div className="flex justify-start">
              <button 
                onClick={() => setIsCreatingProblem(true)}
                className="px-8 py-3 bg-myth-gold/10 border border-myth-gold text-myth-gold rounded hover:bg-myth-gold hover:text-obsidian font-myth uppercase font-bold text-sm transition-all shadow-glow-gold flex items-center gap-2"
              >
                <span className="text-xl">+</span> Create New Trial
              </button>
            </div>
          )}

          {isCreatingProblem ? (
            <div className="bg-myth-dark border border-myth-jade/30 p-6 rounded relative animate-stagger-in">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-myth-jade via-myth-gold to-myth-jade"></div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-myth-jade font-myth tracking-widest uppercase text-xl">Manifest New Trial</h2>
                <button onClick={() => setIsCreatingProblem(false)} className="text-gray-500 hover:text-white uppercase text-xs font-bold">Cancel Manifestation</button>
              </div>
              
              <form onSubmit={handleCreateProblem} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-myth-gold/60 text-xs font-bold uppercase tracking-widest mb-2 font-myth">Title</label>
                  <input 
                    type="text" 
                    value={createFormData.title}
                    onChange={e => setCreateFormData({...createFormData, title: e.target.value})}
                    className="w-full bg-obsidian border border-gray-700 rounded p-3 text-gray-200 focus:border-myth-jade outline-none" 
                    placeholder="E.g. The Addition Mystery"
                    required 
                  />
                </div>
                
                <div>
                  <label className="block text-myth-gold/60 text-xs font-bold uppercase tracking-widest mb-2 font-myth">Chapter</label>
                  <input 
                    type="number" 
                    value={createFormData.chapter}
                    onChange={e => setCreateFormData({...createFormData, chapter: parseInt(e.target.value)})}
                    className="w-full bg-obsidian border border-gray-700 rounded p-3 text-gray-200 focus:border-myth-jade outline-none" 
                    required 
                  />
                </div>

                <div>
                  <label className="block text-myth-gold/60 text-xs font-bold uppercase tracking-widest mb-2 font-myth">Round (1 or 2)</label>
                  <select 
                    value={createFormData.round}
                    onChange={e => setCreateFormData({...createFormData, round: parseInt(e.target.value)})}
                    className="w-full bg-obsidian border border-gray-700 rounded p-3 text-gray-200 focus:border-myth-jade outline-none"
                  >
                    <option value={1}>Round 1</option>
                    <option value={2}>Round 2</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-myth-gold/60 text-xs font-bold uppercase tracking-widest mb-2 font-myth">Severity (Difficulty)</label>
                  <select 
                    value={createFormData.difficulty}
                    onChange={e => setCreateFormData({...createFormData, difficulty: e.target.value})}
                    className="w-full bg-obsidian border border-gray-700 rounded p-3 text-gray-200 focus:border-myth-jade outline-none"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-myth-gold/60 text-xs font-bold uppercase tracking-widest mb-2 font-myth">Tongue (Language)</label>
                  <select 
                    value={createFormData.language}
                    onChange={e => setCreateFormData({...createFormData, language: e.target.value})}
                    className="w-full bg-obsidian border border-gray-700 rounded p-3 text-gray-200 focus:border-myth-jade outline-none"
                  >
                    <option value="python">Python</option>
                    <option value="c">C</option>
                    <option value="java">Java</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-myth-gold/60 text-xs font-bold uppercase tracking-widest mb-2 font-myth">Merit (Points)</label>
                  <input 
                    type="number" 
                    value={createFormData.points}
                    onChange={e => setCreateFormData({...createFormData, points: parseInt(e.target.value)})}
                    className="w-full bg-obsidian border border-gray-700 rounded p-3 text-gray-200 focus:border-myth-jade outline-none" 
                    required 
                  />
                </div>
                
                <div>
                  <label className="block text-myth-gold/60 text-xs font-bold uppercase tracking-widest mb-2 font-myth">Time Limit (Minutes, 0=None)</label>
                  <input 
                    type="number" 
                    value={createFormData.time_limit}
                    onChange={e => setCreateFormData({...createFormData, time_limit: parseInt(e.target.value) || 0})}
                    className="w-full bg-obsidian border border-gray-700 rounded p-3 text-gray-200 focus:border-myth-jade outline-none" 
                    required 
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-myth-gold/60 text-xs font-bold uppercase tracking-widest mb-2 font-myth">Heavenly Decree (Description)</label>
                  <textarea 
                    value={createFormData.description}
                    onChange={e => setCreateFormData({...createFormData, description: e.target.value})}
                    placeholder="Describe the trial..."
                    className="w-full h-32 bg-obsidian border border-gray-700 rounded p-3 text-gray-300 font-body text-sm focus:border-myth-jade outline-none" 
                    required 
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-myth-gold/60 text-xs font-bold uppercase tracking-widest mb-2 font-myth">Corrupted Scripture (Buggy Code)</label>
                  <textarea 
                    value={createFormData.buggy_code}
                    onChange={e => setCreateFormData({...createFormData, buggy_code: e.target.value})}
                    placeholder="Enter the code with bugs..."
                    className="w-full h-48 bg-obsidian border border-gray-700 rounded p-3 text-myth-jade font-mono text-sm focus:border-myth-jade outline-none" 
                    required 
                  />
                </div>

                {/* ── Fixed Code Runner – Create form ── */}
                <div className="md:col-span-2 bg-black/40 border border-myth-jade/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">⚙️</span>
                    <h3 className="text-myth-jade font-myth uppercase tracking-widest text-xs font-bold">Auto-Generate Expected Output</h3>
                    <span className="text-[9px] text-gray-600 font-body">Paste the correct (fixed) code below, run it, and the output will auto-fill</span>
                  </div>
                  <textarea
                    value={fixedCodeTarget === 'create' ? fixedCode : ''}
                    onFocus={() => { setFixedCodeTarget('create'); setFixedCodeResult(''); }}
                    onChange={e => setFixedCode(e.target.value)}
                    placeholder={`Paste the CORRECT fixed ${createFormData.language} code here...`}
                    className="w-full h-36 bg-obsidian border border-myth-jade/30 rounded p-3 text-myth-jade font-mono text-sm focus:border-myth-jade outline-none mb-3"
                  />
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleRunFixedCode('create')}
                      disabled={fixedCodeRunning || !fixedCode.trim()}
                      className="px-5 py-2 bg-myth-jade/20 border border-myth-jade text-myth-jade rounded hover:bg-myth-jade hover:text-obsidian font-myth uppercase font-bold text-xs transition-all disabled:opacity-40 flex items-center gap-2"
                    >
                      {fixedCodeRunning && fixedCodeTarget === 'create' ? (
                        <><span className="w-3 h-3 border border-myth-jade border-t-transparent rounded-full animate-spin"></span> Running...</>
                      ) : '▶ Run & Auto-fill Output'}
                    </button>
                    {fixedCodeTarget === 'create' && fixedCodeResult && (
                      <span className="text-myth-jade/70 text-xs font-mono truncate flex-1">✓ Output captured and filled below</span>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-myth-gold/60 text-xs font-bold uppercase tracking-widest mb-2 font-myth">Expected Destiny (Expected Output)</label>
                  <textarea 
                    value={createFormData.expected_output}
                    onChange={e => setCreateFormData({...createFormData, expected_output: e.target.value})}
                    placeholder="Enter the correct output..."
                    className="w-full h-24 bg-obsidian border border-gray-700 rounded p-3 text-gray-300 font-mono text-sm focus:border-myth-jade outline-none" 
                    required 
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-myth-gold/60 text-xs font-bold uppercase tracking-widest mb-2 font-myth">Hint (Secret Reveal)</label>
                  <input 
                    type="text" 
                    value={createFormData.hint}
                    onChange={e => setCreateFormData({...createFormData, hint: e.target.value})}
                    placeholder="Optional hint..."
                    className="w-full bg-obsidian border border-gray-700 rounded p-3 text-gray-300 focus:border-myth-jade outline-none" 
                  />
                </div>

                <div className="md:col-span-2 flex justify-end gap-4 mt-6">
                  <button type="button" onClick={() => setIsCreatingProblem(false)} className="px-6 py-2 border border-gray-600 text-gray-400 rounded font-myth uppercase font-bold text-sm">Discard</button>
                  <button type="submit" className="px-10 py-2 bg-myth-jade/20 border border-myth-jade text-myth-jade rounded hover:bg-myth-jade hover:text-obsidian font-myth uppercase font-bold text-sm transition-all shadow-[0_0_15px_rgba(0,255,127,0.2)]">Grant Destiny</button>
                </div>
              </form>
            </div>
          ) : editingProblem ? (
            <div className="bg-myth-dark border border-myth-gold/30 p-6 rounded relative animate-stagger-in">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-myth-gold via-myth-red to-myth-gold"></div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-myth-gold font-myth tracking-widest uppercase text-xl">Alter Existing Scripture</h2>
                <button onClick={() => setEditingProblem(null)} className="text-gray-500 hover:text-white uppercase text-xs font-bold">Cancel Alteration</button>
              </div>
              
              <form onSubmit={handleUpdateProblem} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-myth-gold/60 text-xs font-bold uppercase tracking-widest mb-2 font-myth">Title</label>
                  <input 
                    type="text" 
                    value={editFormData.title}
                    onChange={e => setEditFormData({...editFormData, title: e.target.value})}
                    className="w-full bg-obsidian border border-gray-700 rounded p-3 text-gray-200 focus:border-myth-gold outline-none" 
                    required 
                  />
                </div>
                
                <div>
                  <label className="block text-myth-gold/60 text-xs font-bold uppercase tracking-widest mb-2 font-myth">Chapter</label>
                  <input 
                    type="number" 
                    value={editFormData.chapter}
                    onChange={e => setEditFormData({...editFormData, chapter: parseInt(e.target.value)})}
                    className="w-full bg-obsidian border border-gray-700 rounded p-3 text-gray-200 focus:border-myth-gold outline-none" 
                    required 
                  />
                </div>

                <div>
                  <label className="block text-myth-gold/60 text-xs font-bold uppercase tracking-widest mb-2 font-myth">Round (1 or 2)</label>
                  <select 
                    value={editFormData.round}
                    onChange={e => setEditFormData({...editFormData, round: parseInt(e.target.value)})}
                    className="w-full bg-obsidian border border-gray-700 rounded p-3 text-gray-200 focus:border-myth-gold outline-none"
                  >
                    <option value={1}>Round 1</option>
                    <option value={2}>Round 2</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-myth-gold/60 text-xs font-bold uppercase tracking-widest mb-2 font-myth">Severity (Difficulty)</label>
                  <select 
                    value={editFormData.difficulty}
                    onChange={e => setEditFormData({...editFormData, difficulty: e.target.value})}
                    className="w-full bg-obsidian border border-gray-700 rounded p-3 text-gray-200 focus:border-myth-gold outline-none"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-myth-gold/60 text-xs font-bold uppercase tracking-widest mb-2 font-myth">Tongue (Language)</label>
                  <select 
                    value={editFormData.language}
                    onChange={e => setEditFormData({...editFormData, language: e.target.value})}
                    className="w-full bg-obsidian border border-gray-700 rounded p-3 text-gray-200 focus:border-myth-gold outline-none"
                  >
                    <option value="python">Python</option>
                    <option value="c">C</option>
                    <option value="java">Java</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-myth-gold/60 text-xs font-bold uppercase tracking-widest mb-2 font-myth">Merit (Points)</label>
                  <input 
                    type="number" 
                    value={editFormData.points}
                    onChange={e => setEditFormData({...editFormData, points: parseInt(e.target.value)})}
                    className="w-full bg-obsidian border border-gray-700 rounded p-3 text-gray-200 focus:border-myth-gold outline-none" 
                    required 
                  />
                </div>

                <div>
                  <label className="block text-myth-gold/60 text-xs font-bold uppercase tracking-widest mb-2 font-myth">Time Limit (Minutes, 0=None)</label>
                  <input 
                    type="number" 
                    value={editFormData.time_limit}
                    onChange={e => setEditFormData({...editFormData, time_limit: parseInt(e.target.value) || 0})}
                    className="w-full bg-obsidian border border-gray-700 rounded p-3 text-gray-200 focus:border-myth-gold outline-none" 
                    required 
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-myth-gold/60 text-xs font-bold uppercase tracking-widest mb-2 font-myth">Heavenly Decree (Description)</label>
                  <textarea 
                    value={editFormData.description}
                    onChange={e => setEditFormData({...editFormData, description: e.target.value})}
                    className="w-full h-32 bg-obsidian border border-gray-700 rounded p-3 text-gray-300 font-body text-sm focus:border-myth-gold outline-none" 
                    required 
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-myth-gold/60 text-xs font-bold uppercase tracking-widest mb-2 font-myth">Corrupted Scripture (Buggy Code)</label>
                  <textarea 
                    value={editFormData.buggy_code}
                    onChange={e => setEditFormData({...editFormData, buggy_code: e.target.value})}
                    className="w-full h-48 bg-obsidian border border-gray-700 rounded p-3 text-myth-jade font-mono text-sm focus:border-myth-gold outline-none" 
                    required 
                  />
                </div>

                {/* ── Fixed Code Runner – Edit form ── */}
                <div className="md:col-span-2 bg-black/40 border border-myth-gold/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">⚙️</span>
                    <h3 className="text-myth-gold font-myth uppercase tracking-widest text-xs font-bold">Auto-Generate Expected Output</h3>
                    <span className="text-[9px] text-gray-600 font-body">Paste the correct (fixed) code, run it — output auto-fills below</span>
                  </div>
                  <textarea
                    value={fixedCodeTarget === 'edit' ? fixedCode : ''}
                    onFocus={() => { setFixedCodeTarget('edit'); setFixedCodeResult(''); }}
                    onChange={e => setFixedCode(e.target.value)}
                    placeholder={`Paste the CORRECT fixed ${editFormData.language} code here...`}
                    className="w-full h-36 bg-obsidian border border-myth-gold/30 rounded p-3 text-myth-jade font-mono text-sm focus:border-myth-gold outline-none mb-3"
                  />
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleRunFixedCode('edit')}
                      disabled={fixedCodeRunning || !fixedCode.trim()}
                      className="px-5 py-2 bg-myth-gold/20 border border-myth-gold text-myth-gold rounded hover:bg-myth-gold hover:text-obsidian font-myth uppercase font-bold text-xs transition-all disabled:opacity-40 flex items-center gap-2"
                    >
                      {fixedCodeRunning && fixedCodeTarget === 'edit' ? (
                        <><span className="w-3 h-3 border border-myth-gold border-t-transparent rounded-full animate-spin"></span> Running...</>
                      ) : '▶ Run & Auto-fill Output'}
                    </button>
                    {fixedCodeTarget === 'edit' && fixedCodeResult && (
                      <span className="text-myth-gold/70 text-xs font-mono">✓ Output captured and filled below</span>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-myth-gold/60 text-xs font-bold uppercase tracking-widest mb-2 font-myth">Expected Destiny (Expected Output)</label>
                  <textarea 
                    value={editFormData.expected_output}
                    onChange={e => setEditFormData({...editFormData, expected_output: e.target.value})}
                    className="w-full h-24 bg-obsidian border border-gray-700 rounded p-3 text-gray-300 font-mono text-sm focus:border-myth-gold outline-none" 
                    required 
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-myth-gold/60 text-xs font-bold uppercase tracking-widest mb-2 font-myth">Hint (Secret Reveal)</label>
                  <input 
                    type="text" 
                    value={editFormData.hint}
                    onChange={e => setEditFormData({...editFormData, hint: e.target.value})}
                    className="w-full bg-obsidian border border-gray-700 rounded p-3 text-gray-300 focus:border-myth-gold outline-none" 
                  />
                </div>

                <div className="md:col-span-2 flex justify-end gap-4 mt-6">
                  <button type="button" onClick={() => setEditingProblem(null)} className="px-6 py-2 border border-gray-600 text-gray-400 rounded font-myth uppercase font-bold text-sm">Discard Changes</button>
                  <button type="submit" className="px-10 py-2 bg-myth-gold/20 border border-myth-gold text-myth-gold rounded hover:bg-myth-gold hover:text-obsidian font-myth uppercase font-bold text-sm transition-all shadow-glow-gold">Update Destiny</button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-myth-dark border border-gray-800 p-6 rounded">
              <h2 className="text-myth-red font-myth tracking-widest uppercase mb-4 text-xl">Inscribe Heavenly Scripture (JSON)</h2>
              <p className="text-gray-400 font-body text-sm mb-4">Provide the scrolls of trials: {`[ { "round": 1, "difficulty": "easy", "language": "python", "title": "...", "description": "...", "buggy_code": "...", "expected_output": "...", "points": 10, "time_limit": 5 } ]`}</p>
              <textarea
                className="w-full h-40 bg-obsidian border border-gray-700 rounded text-myth-jade font-mono p-4 text-sm focus:border-myth-red outline-none mb-4"
                value={jsonText}
                onChange={e => setJsonText(e.target.value)}
                placeholder="Unroll the scroll here..."
              />
              <div className="flex gap-4">
                <input type="file" ref={problemFileInputRef} onChange={handleProblemFileChange} accept=".json" className="hidden" />
                <button 
                  onClick={() => problemFileInputRef.current?.click()}
                  className="px-6 py-2 bg-myth-gold/10 border border-myth-gold text-myth-gold rounded hover:bg-myth-gold hover:text-obsidian font-myth uppercase font-bold text-sm transition-colors"
                >
                  Choose JSON File
                </button>
                <button onClick={handleJsonUpload} disabled={!jsonText} className="px-6 py-2 bg-myth-red/10 border border-myth-red text-myth-red rounded hover:bg-myth-red hover:text-obsidian font-myth uppercase font-bold text-sm disabled:opacity-50 transition-colors">
                  Seal the Decrees
                </button>
              </div>
            </div>
          )}

          <div className="bg-myth-dark border border-gray-800 rounded overflow-hidden">
            <h2 className="text-gray-200 font-myth tracking-widest uppercase p-6 border-b border-gray-800 text-xl border-l-4 border-l-myth-gold">Registry of Trials ({problems.length})</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-body text-xs md:text-sm text-gray-300 min-w-[800px]">
                <thead className="bg-black/50 text-gray-400 uppercase text-xs">
                  <tr>
                    <th className="p-4 border-b border-gray-800">Scroll ID</th>
                    <th className="p-4 border-b border-gray-800 text-left">Location</th>
                    <th className="p-4 border-b border-gray-800">Severity</th>
                    <th className="p-4 border-b border-gray-800">Tongue</th>
                    <th className="p-4 border-b border-gray-800">Title</th>
                    <th className="p-4 border-b border-gray-800">Time Limit</th>
                    <th className="p-4 border-b border-gray-800">Judgement</th>
                  </tr>
                </thead>
                <tbody>
                  {problems.map(p => (
                    <tr key={p.id} className="border-b border-gray-800 hover:bg-white/5 transition-colors">
                      <td className="p-4 text-myth-gold">#{p.id}</td>
                      <td className="p-4 text-gray-400 font-mono text-xs">CH{p.chapter} R{p.round}</td>
                      <td className="p-4">{p.difficulty}</td>
                      <td className="p-4"><span className="bg-obsidian border border-gray-700 px-2 rounded text-xs py-0.5 uppercase text-gray-400">{p.language}</span></td>
                      <td className="p-4 truncate max-w-[200px] text-gray-200">{p.title}</td>
                      <td className="p-4 text-gray-400">{p.time_limit > 0 ? `${p.time_limit} min` : 'None'}</td>
                      <td className="p-4 flex gap-2">
                        <button onClick={() => startEditing(p)} className="text-myth-gold hover:text-yellow-400 font-bold uppercase text-[10px] border border-myth-gold px-2 py-1 rounded bg-myth-gold/10 transition-colors">Alter</button>
                        <button onClick={() => handleDeleteProblem(p.id)} className="text-myth-red hover:text-red-400 font-bold uppercase text-[10px] border border-myth-red px-2 py-1 rounded bg-myth-red/10 transition-colors">Burn</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'teams' && (
        <div className="space-y-8">
          {editingTeam ? (
            <div className="bg-myth-dark border border-myth-gold/30 p-6 rounded relative mb-8 animate-stagger-in">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-myth-gold to-myth-red"></div>
              <h2 className="text-myth-gold font-myth tracking-widest uppercase mb-6 text-xl">Reshape Deity Identity</h2>
              <form onSubmit={handleUpdateTeam} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-myth-gold/60 text-xs font-bold uppercase mb-2 font-myth">Manifestation Name</label>
                  <input 
                    type="text" 
                    value={teamEditFormData.team_name}
                    autoComplete="off"
                    onChange={e => setTeamEditFormData({...teamEditFormData, team_name: e.target.value})}
                    className="w-full bg-obsidian border border-gray-700 rounded p-3 text-gray-200 focus:border-myth-gold outline-none" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-myth-gold/60 text-xs font-bold uppercase mb-2 font-myth">Secret Incantation (New Password)</label>
                  <input 
                    type="password" 
                    autoComplete="off"
                    placeholder="Enter New Password"
                    onChange={e => setTeamEditFormData({...teamEditFormData, password: e.target.value})}
                    className="w-full bg-obsidian border border-gray-700 rounded p-3 text-gray-200 focus:border-myth-gold outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-myth-gold/60 text-xs font-bold uppercase mb-2 font-myth">Total Merit (Points)</label>
                  <input 
                    type="number" 
                    value={teamEditFormData.total_points}
                    onChange={e => setTeamEditFormData({...teamEditFormData, total_points: parseInt(e.target.value) || 0})}
                    className="w-full bg-obsidian border border-gray-700 rounded p-3 text-myh-jade focus:border-myth-gold outline-none font-bold" 
                  />
                </div>
                <div>
                  <label className="block text-myth-gold/60 text-xs font-bold uppercase mb-2 font-myth">Trials Vanquished</label>
                  <input 
                    type="number" 
                    value={teamEditFormData.challenges_completed}
                    onChange={e => setTeamEditFormData({...teamEditFormData, challenges_completed: parseInt(e.target.value) || 0})}
                    className="w-full bg-obsidian border border-gray-700 rounded p-3 text-gray-200 focus:border-myth-gold outline-none font-bold" 
                  />
                </div>
                <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                  <button type="button" onClick={() => setEditingTeam(null)} className="px-4 py-2 border border-gray-600 text-gray-400 rounded font-myth uppercase font-bold text-xs">Cancel</button>
                  <button type="submit" className="px-6 py-2 bg-myth-gold/20 border border-myth-gold text-myth-gold rounded hover:bg-myth-gold font-myth uppercase font-bold text-xs transition-all">Update Identity</button>
                </div>
              </form>
            </div>
          ) : (<>
            <div className="bg-myth-dark border border-gray-800 p-6 rounded">
              <h2 className="text-myth-gold font-myth tracking-widest uppercase mb-4 text-xl flex items-center gap-2">
                <span className="text-2xl pt-1">✨</span> Consecrate New Deity
              </h2>
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <input
                  type="text"
                  value={newTeamName}
                  autoComplete="off"
                  onChange={e => setNewTeamName(e.target.value)}
                  placeholder="Enter Team Name"
                  className="flex-1 bg-obsidian border border-gray-700 rounded text-gray-200 font-body p-3 text-sm focus:border-myth-gold outline-none"
                />
                <button 
                  onClick={handleCreateTeam} 
                  disabled={!newTeamName.trim()} 
                  className="px-8 bg-myth-gold/10 border border-myth-gold text-myth-gold rounded hover:bg-myth-gold hover:text-obsidian font-myth uppercase font-bold text-sm transition-all disabled:opacity-50 whitespace-nowrap"
                >
                  Grant Immortality
                </button>
              </div>

              {/* ── Bulk Import Panel ── */}
              <div className="pt-5 border-t border-gray-800">
                <h3 className="text-gray-300 font-myth tracking-widest uppercase text-sm mb-4 flex items-center gap-2">
                  <span className="text-lg">📜</span> Bulk Manifest Deities
                </h3>
                {/* Tabs */}
                <div className="flex gap-1 mb-4">
                  {[{key:'file',label:'📁 Excel / CSV'},{key:'sheet',label:'📊 Google Sheet'}].map(t=>(
                    <button key={t.key} onClick={()=>setImportTab(t.key)}
                      className={`px-4 py-2 rounded-t text-xs font-myth uppercase font-bold transition-colors ${importTab===t.key?'bg-obsidian border border-b-0 border-gray-700 text-myth-gold':'bg-transparent text-gray-500 hover:text-gray-300'}`}
                    >{t.label}</button>
                  ))}
                </div>

                <div className="bg-obsidian border border-gray-700 rounded-b rounded-tr p-4">
                  {importTab === 'file' ? (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <input type="file" ref={fileInputRef} onChange={handleFilePreview} accept=".xlsx,.xls,.csv" className="hidden" />
                      <button onClick={()=>fileInputRef.current?.click()} disabled={uploading}
                        className="px-6 py-2.5 bg-myth-red/10 border border-myth-red text-myth-red rounded hover:bg-myth-red hover:text-obsidian font-myth uppercase font-bold text-sm transition-all disabled:opacity-50 flex items-center gap-2"
                      >{uploading?'Parsing...':'Choose File (Excel/CSV)'}</button>
                      <p className="text-gray-500 text-[10px] uppercase font-body leading-relaxed">
                        Columns: <span className="text-myth-gold">team_name</span> | <span className="text-gray-400">password</span> (optional)<br/>
                        Supports .xlsx, .xls, .csv
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-gray-500 text-[10px] uppercase font-body">Paste the Google Sheet URL below. The sheet must be shared as <span className="text-myth-gold">"Anyone with the link"</span>.</p>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <input type="text" value={sheetUrl} onChange={e=>setSheetUrl(e.target.value)}
                          placeholder="https://docs.google.com/spreadsheets/d/..."
                          className="flex-1 bg-black/50 border border-gray-600 rounded p-2.5 text-gray-200 font-body text-sm focus:border-myth-gold outline-none"
                        />
                        <button onClick={handleSheetPreview} disabled={uploading||!sheetUrl.trim()}
                          className="px-6 py-2.5 bg-myth-jade/10 border border-myth-jade text-myth-jade rounded hover:bg-myth-jade hover:text-obsidian font-myth uppercase font-bold text-sm transition-all disabled:opacity-50 whitespace-nowrap"
                        >{uploading?'Fetching...':'Preview Sheet'}</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Preview Modal ── */}
            {previewData && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-myth-dark border border-myth-gold/30 rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-stagger-in">
                  <div className="p-5 border-b border-gray-800 flex justify-between items-center">
                    <div>
                      <h3 className="text-myth-gold font-myth tracking-widest uppercase text-lg">Preview Import</h3>
                      <p className="text-gray-500 text-xs font-body mt-1">{previewData.length} deities detected from {previewSource==='sheet'?'Google Sheet':'file'}</p>
                    </div>
                    <button onClick={cancelPreview} className="text-gray-500 hover:text-white text-xl">✕</button>
                  </div>
                  <div className="overflow-y-auto flex-1 p-4">
                    <table className="w-full text-left font-body text-sm text-gray-300">
                      <thead className="text-gray-400 uppercase text-xs sticky top-0 bg-myth-dark">
                        <tr><th className="p-2 border-b border-gray-800">#</th><th className="p-2 border-b border-gray-800">Team Name</th><th className="p-2 border-b border-gray-800">Password</th></tr>
                      </thead>
                      <tbody>
                        {previewData.map((r,i)=>(
                          <tr key={i} className="border-b border-gray-800/50 hover:bg-white/5"><td className="p-2 text-gray-500">{i+1}</td><td className="p-2 text-myth-gold font-bold">{r.team_name}</td><td className="p-2">{r.has_password?<span className="text-myth-jade text-xs">●●●●●●</span>:<span className="text-gray-600 text-xs italic">none</span>}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="p-4 border-t border-gray-800 flex justify-end gap-3">
                    <button onClick={cancelPreview} className="px-5 py-2 border border-gray-600 text-gray-400 rounded font-myth uppercase font-bold text-xs hover:text-white transition-colors">Cancel</button>
                    <button onClick={handleConfirmImport} disabled={uploading}
                      className="px-8 py-2 bg-myth-gold/20 border border-myth-gold text-myth-gold rounded hover:bg-myth-gold hover:text-obsidian font-myth uppercase font-bold text-xs transition-all disabled:opacity-50 shadow-glow-gold"
                    >{uploading?'Importing...':'Confirm Import'}</button>
                  </div>
                </div>
              </div>
            )}
          </>)}

          <div className="bg-myth-dark border border-gray-800 rounded overflow-x-auto">
            <table className="w-full text-left border-collapse font-body text-xs md:text-sm text-gray-300 min-w-[800px]">
            <thead className="bg-black/50 text-gray-400 uppercase text-xs font-myth tracking-wider">
              <tr>
                <th className="p-4 border-b border-gray-800">Reg ID</th>
                <th className="p-4 border-b border-gray-800">Deity Name</th>
                <th className="p-4 border-b border-gray-800">Secret Password</th>
                <th className="p-4 border-b border-gray-800">Merit</th>
                <th className="p-4 border-b border-gray-800">Trials Vanquished</th>
                <th className="p-4 border-b border-gray-800">Ascension Date</th>
                <th className="p-4 border-b border-gray-800">Divine Judgement</th>
              </tr>
            </thead>
            <tbody>
              {teams.map(t => (
                <tr key={t.id} className="border-b border-gray-800 hover:bg-white/5 transition-colors">
                  <td className="p-4 text-gray-500">#{t.id}</td>
                  <td className="p-4 font-bold text-myth-gold tracking-wide">{t.team_name}</td>
                  <td className="p-4 font-mono text-xs text-myth-red">{t.password || <span className="text-gray-600 italic">Hidden/Unknown</span>}</td>
                  <td className="p-4 font-bold">{t.total_points || 0} PTS</td>
                  <td className="p-4">{t.challenges_completed || 0}</td>
                  <td className="p-4 text-gray-500 text-xs">{new Date(t.created_at).toLocaleString()}</td>
                  <td className="p-4 flex gap-2">
                     <button onClick={() => startEditingTeam(t)} className="text-myth-gold hover:text-yellow-400 font-bold uppercase text-[10px] border border-myth-gold/30 px-2 py-1 rounded bg-myth-gold/5 transition-colors">Alter Identity</button>
                     <button onClick={() => handleResetTeam(t.id)} className="text-orange-500 hover:text-orange-400 font-bold uppercase text-[10px] border border-orange-900 px-2 py-1 rounded bg-orange-900/10 transition-colors">Strip Merit</button>
                     <button onClick={() => handleDeleteTeam(t.id)} className="text-myth-red hover:text-red-400 font-bold uppercase text-[10px] border border-myth-red px-2 py-1 rounded bg-myth-red/10 transition-colors">Eradicate</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {activeTab === 'submissions' && (
        <div className="bg-myth-dark border border-gray-800 rounded overflow-x-auto">
          <table className="w-full text-left border-collapse font-body text-xs md:text-sm text-gray-300 min-w-[800px]">
            <thead className="bg-black/50 text-gray-400 uppercase text-xs font-myth tracking-wider">
              <tr>
                <th className="p-4 border-b border-gray-800">Epoch</th>
                <th className="p-4 border-b border-gray-800">Deity</th>
                <th className="p-4 border-b border-gray-800">Trial</th>
                <th className="p-4 border-b border-gray-800">Tongue</th>
                <th className="p-4 border-b border-gray-800">Outcome</th>
                <th className="p-4 border-b border-gray-800">Merit Earned</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map(s => (
                <tr key={s.id} className="border-b border-gray-800 hover:bg-white/5 transition-colors">
                  <td className="p-4 text-gray-500 text-xs">{new Date(s.submitted_at).toLocaleTimeString()}</td>
                  <td className="p-4 font-bold text-myth-gold">{s.team_name}</td>
                  <td className="p-4 truncate max-w-[150px] text-gray-300">{s.title}</td>
                  <td className="p-4 text-xs uppercase text-gray-400"><span className="bg-obsidian border border-gray-700 px-2 py-0.5 rounded">{s.language}</span></td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                      s.result === 'correct' ? 'bg-myth-gold/20 border border-myth-gold text-myth-gold shadow-[0_0_10px_rgba(212,175,55,0.15)]' : 
                      s.result === 'expired' ? 'bg-myth-red/10 border border-myth-red text-myth-red/70 whitespace-nowrap' :
                      'bg-myth-red/20 border border-myth-red text-myth-red'
                    }`}>
                      {s.result === 'correct' ? 'VERIFIED' : s.result === 'expired' ? 'AUTO-SEALED' : 'FAILED'}
                    </span>
                  </td>
                  <td className="p-4">
                    {gradingSubmission === s.id ? (
                      <div className="flex gap-2 items-center">
                        <input 
                          type="number" 
                          value={submissionScore} 
                          onChange={e => setSubmissionScore(e.target.value)}
                          className="w-16 bg-obsidian border border-myth-gold/50 rounded p-1 text-xs text-myth-gold outline-none"
                        />
                        <button onClick={() => handleGradeSubmission(s.id)} className="text-myth-jade hover:text-white text-[10px] font-bold uppercase">Save</button>
                        <button onClick={() => setGradingSubmission(null)} className="text-gray-500 hover:text-white text-[10px] font-bold uppercase">X</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${s.score > 0 ? 'text-myth-gold' : 'text-gray-600'}`}>
                          {s.score} PTS
                        </span>
                        <button 
                          onClick={() => { setGradingSubmission(s.id); setSubmissionScore(s.score); }}
                          className="px-2 py-1 border border-gray-700 rounded text-[9px] uppercase hover:border-myth-gold hover:text-myth-gold transition-colors"
                        >
                          Grade
                        </button>
                        {s.result === 'expired' && (
                          <button 
                            onClick={() => handleResetTimer(s.team_id, s.problem_id)} 
                            className="px-2 py-1 border border-myth-red text-myth-red rounded text-[9px] uppercase hover:bg-myth-red hover:text-obsidian transition-all"
                          >
                            Unseal
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'sovereignty' && (
        <div className="max-w-2xl mx-auto animate-stagger-in">
          <div className="bg-myth-dark border border-myth-red/30 p-8 rounded relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-myth-red/5 blur-3xl rounded-full -mr-16 -mt-16"></div>
            <h2 className="text-myth-red font-myth tracking-[0.3em] uppercase mb-8 text-2xl text-center">Celestial Sovereignty</h2>
            
            <form onSubmit={handleUpdateAdmin} className="space-y-6">
              <div>
                <label className="block text-myth-gold/60 text-xs font-bold uppercase tracking-widest mb-3 font-myth">Jade Emperor Alias (Username)</label>
                <input 
                  type="text" 
                  value={adminFormData.username}
                  onChange={e => setAdminFormData({...adminFormData, username: e.target.value})}
                  className="w-full bg-obsidian border border-gray-700 rounded p-4 text-gray-200 focus:border-myth-red outline-none transition-all shadow-inner" 
                  placeholder="Enter new divine name..."
                  required 
                />
              </div>
              
              <div>
                <label className="block text-myth-gold/60 text-xs font-bold uppercase tracking-widest mb-3 font-myth">Divine Seal (New Password)</label>
                <input 
                  type="password" 
                  value={adminFormData.password}
                  onChange={e => setAdminFormData({...adminFormData, password: e.target.value})}
                  className="w-full bg-obsidian border border-gray-700 rounded p-4 text-gray-200 focus:border-myth-red outline-none transition-all shadow-inner" 
                  placeholder="Enter new celestial key..."
                  required 
                />
                <p className="text-gray-500 text-[10px] mt-2 font-body uppercase tracking-tighter">* Changing this will immediately reshape your divine manifestation.</p>
              </div>

              <div className="pt-4">
                <button 
                  type="submit" 
                  className="w-full py-4 bg-myth-red/20 border border-myth-red text-myth-red rounded font-myth uppercase font-bold tracking-widest hover:bg-myth-red hover:text-obsidian transition-all duration-500 shadow-glow-red"
                >
                  Alter Fundamental Reality
                </button>
              </div>
            </form>
          </div>
          
          <div className="mt-8 p-6 border border-gray-800 rounded bg-black/30 backdrop-blur-sm">
            <h3 className="text-myth-gold font-myth uppercase text-sm mb-3 tracking-widest">Authority Decree</h3>
            <p className="text-gray-500 text-xs font-body leading-relaxed">
              As the Jade Emperor, you hold the power to reshape the identities of all deities (teams) and even your own sovereign form. 
              Be cautious, for once the reality is altered, the old manifests are banished to the void.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

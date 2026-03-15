import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

// Floating mythic characters for the background
const MYTHIC_CHARS = ['V', 'U', 'L', 'N', 'I', 'X', '2', '0', '⚔', '🐉', '龍', '鬼', '魂', '武', '道', '天', '命', '仙', '神', '气'];

function Ember({ delay, left, duration, size }) {
  return (
    <div
      className="ember"
      style={{
        left: `${left}%`,
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
        width: `${size}px`,
        height: `${size}px`,
        filter: `blur(${size > 4 ? 1 : 0}px)`,
      }}
    />
  );
}

function FloatingChar({ char, style }) {
  return (
    <div
      className="absolute font-myth select-none animate-float-char"
      style={{
        ...style,
        fontSize: `${30 + Math.random() * 50}px`,
        color: char === 'X' ? 'rgba(139, 0, 0, 0.12)' : 'rgba(212, 175, 55, 0.06)',
      }}
    >
      {char}
    </div>
  );
}

function LightningBolt({ style }) {
  return (
    <div className="absolute pointer-events-none" style={style}>
      <svg width="60" height="120" viewBox="0 0 60 120" fill="none" className="animate-lightning">
        <path d="M30 0L15 50H30L10 120L50 45H30L45 0H30Z" fill="url(#lgold)" opacity="0.15"/>
        <defs>
          <linearGradient id="lgold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d4af37"/>
            <stop offset="100%" stopColor="#8b0000"/>
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

export default function Login() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const { loginTeam, loginAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Clear any stale tokens on login page load
    localStorage.removeItem('token');
    setTimeout(() => setMounted(true), 100);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isAdmin) {
        await loginAdmin(username, password);
      } else {
        await loginTeam(teamName, password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Connection error.');
    } finally {
      setLoading(false);
    }
  };

  // Generate embers
  const embers = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 10,
    duration: 5 + Math.random() * 10,
    size: 2 + Math.random() * 6,
  }));

  // Generate floating characters
  const floatingChars = MYTHIC_CHARS.map((char, i) => ({
    char,
    style: {
      left: `${3 + (i / MYTHIC_CHARS.length) * 94}%`,
      top: `${5 + Math.random() * 90}%`,
      animationDelay: `${i * 0.4}s`,
      animationDuration: `${5 + Math.random() * 8}s`,
    },
  }));

  return (
    <div className="min-h-screen flex items-center justify-center bg-obsidian p-4 md:p-8 relative overflow-hidden animate-brightness-flicker">
      <div className="cyber-grid"></div>
      <div className="scanline"></div>
      
      {/* === ANIMATED BACKGROUND LAYER === */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        
        {/* Large drifting orbs - less opacity on mobile */}
        <div className="absolute top-1/4 left-1/4 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-myth-gold/5 rounded-full blur-[100px] animate-drift"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[250px] md:w-[400px] h-[250px] md:h-[400px] bg-myth-red/8 rounded-full blur-[80px] animate-drift" style={{ animationDelay: '-5s', animationDirection: 'reverse' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] md:w-[300px] h-[200px] md:h-[300px] bg-myth-gold/3 rounded-full blur-[60px] animate-breathe"></div>
        
        {/* Extra crimson glow for X branding */}
        <div className="absolute top-[35%] left-1/2 -translate-x-1/2 w-[200px] h-[200px] bg-myth-red/10 rounded-full blur-[50px] animate-breathe" style={{ animationDelay: '1s' }}></div>

        {/* Rotating golden halo ring - scaled for mobile */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] md:w-[700px] h-[350px] md:h-[700px] animate-spin-slow" style={{ animationDuration: '50s' }}>
          <div className="absolute inset-0 rounded-full border border-myth-gold/10"></div>
          <div className="absolute inset-6 rounded-full border border-dashed border-myth-gold/5"></div>
          <div className="absolute inset-12 rounded-full border border-dotted border-myth-red/5"></div>
          <div className="absolute top-0 left-1/2 w-3 h-3 bg-myth-gold/40 rounded-full -translate-x-1/2 -translate-y-1/2 animate-breathe"></div>
          <div className="absolute bottom-0 left-1/2 w-2 h-2 bg-myth-red/50 rounded-full -translate-x-1/2 translate-y-1/2 animate-breathe" style={{ animationDelay: '1s' }}></div>
          <div className="absolute left-0 top-1/2 w-2 h-2 bg-myth-gold/30 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute right-0 top-1/2 w-2 h-2 bg-myth-red/30 rounded-full translate-x-1/2 -translate-y-1/2"></div>
        </div>

        {/* Second smaller halo, opposite direction */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] animate-spin-slow" style={{ animationDuration: '30s', animationDirection: 'reverse' }}>
          <div className="absolute inset-0 rounded-full border border-myth-red/5"></div>
          <div className="absolute left-0 top-1/2 w-1.5 h-1.5 bg-myth-gold/30 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute right-0 top-1/2 w-1.5 h-1.5 bg-myth-gold/20 rounded-full translate-x-1/2 -translate-y-1/2"></div>
        </div>

        {/* Third halo - very large and subtle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] animate-spin-slow" style={{ animationDuration: '80s' }}>
          <div className="absolute inset-0 rounded-full border border-myth-gold/[0.03]"></div>
        </div>

        {/* Lightning bolts */}
        <LightningBolt style={{ top: '10%', left: '15%', animationDelay: '0s' }} />
        <LightningBolt style={{ top: '20%', right: '10%', animationDelay: '2s', transform: 'scaleX(-1)' }} />
        <LightningBolt style={{ bottom: '15%', left: '8%', animationDelay: '4s' }} />

        {/* Ember particles rising upward */}
        {embers.map(e => (
          <Ember key={e.id} {...e} />
        ))}

        {/* Floating characters */}
        {floatingChars.map((fc, i) => (
          <FloatingChar key={i} {...fc} />
        ))}

        {/* Ripple rings from center */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="ripple-ring w-40 h-40 -ml-20 -mt-20"></div>
          <div className="ripple-ring w-40 h-40 -ml-20 -mt-20" style={{ animationDelay: '1.3s' }}></div>
          <div className="ripple-ring w-40 h-40 -ml-20 -mt-20" style={{ animationDelay: '2.6s' }}></div>
          <div className="ripple-ring w-40 h-40 -ml-20 -mt-20" style={{ animationDelay: '3.9s' }}></div>
        </div>

        {/* Wandering smoke wisps */}
        <div className="absolute top-[20%] left-[10%] w-64 h-1 bg-gradient-to-r from-transparent via-myth-gold/10 to-transparent animate-drift rotate-12" style={{ animationDuration: '20s' }}></div>
        <div className="absolute top-[60%] right-[10%] w-48 h-1 bg-gradient-to-r from-transparent via-myth-red/10 to-transparent animate-drift -rotate-6" style={{ animationDuration: '18s', animationDelay: '-8s' }}></div>
        <div className="absolute top-[40%] left-[50%] w-80 h-0.5 bg-gradient-to-r from-transparent via-myth-gold/5 to-transparent animate-drift rotate-3" style={{ animationDuration: '25s', animationDelay: '-12s' }}></div>
      </div>

      {/* === MAIN CONTENT === */}
      <div className={`w-full max-w-md relative z-10 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
        
        {/* Title Section */}
        <div className="text-center mb-10">
          {/* Decorative top flourish */}
          <div className="flex items-center justify-center gap-3 mb-6 animate-fade-delayed">
            <div className="w-12 h-px bg-gradient-to-r from-transparent to-myth-gold/30"></div>
            <div className="w-1.5 h-1.5 rotate-45 border border-myth-gold/40 animate-spin-slow" style={{ animationDuration: '8s' }}></div>
            <div className="w-8 h-px bg-myth-gold/20"></div>
            <div className="w-1.5 h-1.5 rotate-45 bg-myth-red/40 animate-breathe"></div>
            <div className="w-8 h-px bg-myth-gold/20"></div>
            <div className="w-1.5 h-1.5 rotate-45 border border-myth-gold/40 animate-spin-slow" style={{ animationDuration: '8s', animationDirection: 'reverse' }}></div>
            <div className="w-12 h-px bg-gradient-to-l from-transparent to-myth-gold/30"></div>
          </div>

          {/* VULNIX 2.0 Title */}
          <h1 className="text-4xl md:text-6xl font-myth font-bold mb-1 tracking-[0.2em] md:tracking-[0.3em] animate-title-expand leading-tight group">
            <span className="text-myth-gold text-glow-gold">VULNI</span><span className="text-myth-red text-glow-red text-5xl md:text-7xl group-hover:animate-glitch transition-all animate-neon-flicker">X</span>
          </h1>
          <h2 className="text-2xl font-myth font-bold text-myth-gold/80 tracking-[0.5em] animate-title-expand mt-1" style={{ animationDelay: '0.3s', animationFillMode: 'backwards' }}>
            2.0
          </h2>
          
          <p className="mt-5 text-myth-gold/50 font-body tracking-[0.5em] text-[10px] uppercase animate-fade-delayed">
            COLLEGE DEBUGGING COMPETITION
          </p>

          {/* Decorative bottom flourish */}
          <div className="flex items-center justify-center gap-3 mt-4 animate-fade-delayed" style={{ animationDelay: '0.5s' }}>
            <div className="w-20 h-px bg-gradient-to-r from-transparent to-myth-gold/30"></div>
            <div className="w-2 h-2 rotate-45 border border-myth-gold/40 animate-breathe"></div>
            <div className="w-4 h-px bg-myth-red/40"></div>
            <div className="w-2 h-2 rotate-45 border border-myth-red/40 animate-breathe" style={{ animationDelay: '1s' }}></div>
            <div className="w-20 h-px bg-gradient-to-l from-transparent to-myth-gold/30"></div>
          </div>
        </div>

        {/* Login Card */}
        <div className={`bg-myth-dark/90 backdrop-blur-xl border border-myth-gold/20 rounded-lg p-6 md:p-8 relative overflow-hidden hover-glow-gold transition-all duration-700 ${mounted ? 'animate-slide-up' : 'opacity-0'}`} style={{ animationDelay: '0.4s', animationFillMode: 'backwards' }}>
          
          {/* Animated top border gradient */}
          <div className="absolute top-0 left-0 w-full h-[2px] animated-border"></div>
          {/* Animated bottom border gradient */}
          <div className="absolute bottom-0 left-0 w-full h-[1px] animated-border" style={{ animationDelay: '1.5s' }}></div>
          
          {/* Decorative corners with pulse */}
          <div className="absolute top-0 left-0 w-10 h-10 border-t-2 border-l-2 border-myth-gold/50 animate-corner-pulse rounded-tl"></div>
          <div className="absolute top-0 right-0 w-10 h-10 border-t-2 border-r-2 border-myth-gold/50 animate-corner-pulse rounded-tr" style={{ animationDelay: '0.5s' }}></div>
          <div className="absolute bottom-0 left-0 w-10 h-10 border-b-2 border-l-2 border-myth-gold/50 animate-corner-pulse rounded-bl" style={{ animationDelay: '1s' }}></div>
          <div className="absolute bottom-0 right-0 w-10 h-10 border-b-2 border-r-2 border-myth-gold/50 animate-corner-pulse rounded-br" style={{ animationDelay: '1.5s' }}></div>

          {/* Inner ambient light */}
          <div className="absolute inset-0 bg-gradient-to-b from-myth-gold/[0.03] via-transparent to-myth-red/[0.03] pointer-events-none"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-myth-gold/[0.02] rounded-full blur-3xl pointer-events-none animate-breathe"></div>

          {/* Toggle Tabs */}
          <div className="flex mb-8 border-b border-myth-darker relative">
            <button
              onClick={() => setIsAdmin(false)}
              className={`flex-1 pb-3 text-sm font-bold tracking-wider transition-all duration-500 relative ${!isAdmin ? 'text-myth-gold text-glow-gold scale-105' : 'text-gray-600 hover:text-myth-gold/60'}`}
            >
              {!isAdmin && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-myth-gold animated-border"></div>}
              TEAM LOGIN
            </button>
            <button
              onClick={() => setIsAdmin(true)}
              className={`flex-1 pb-3 text-sm font-bold tracking-wider transition-all duration-500 relative ${isAdmin ? 'text-myth-red text-glow-red scale-105' : 'text-gray-600 hover:text-myth-red/60'}`}
            >
              {isAdmin && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-myth-red animated-border"></div>}
              ADMIN LOGIN
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {/* Hidden bait inputs to capture browser autofill */}
            <input type="text" name="prevent_autofill" style={{ display: 'none' }} />
            <input type="password" name="password_prevent_autofill" style={{ display: 'none' }} />
            
            {error && (
              <div className="bg-myth-red/10 border border-myth-red/50 text-myth-red px-4 py-3 rounded text-sm font-body flex items-start animate-stagger-in">
                <span className="mr-2 animate-bounce">⚔️</span>
                {error}
              </div>
            )}

            {!isAdmin ? (
              <div className="animate-stagger-in" style={{ animationDelay: '0.1s', animationFillMode: 'backwards' }}>
                <label className="block text-myth-gold/80 text-xs font-bold mb-2 uppercase tracking-widest font-myth">
                  Team Name
                </label>
                <div className="relative group transition-all duration-300">
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    autoComplete="off"
                    className="w-full bg-myth-darker border border-myth-gold/30 rounded px-4 py-3.5 text-myth-gold focus:outline-none focus:border-myth-gold focus:shadow-myth-gold transition-all duration-300 font-body hover:border-myth-gold/50 placeholder:text-gray-700 backdrop-blur-sm"
                    placeholder="Team Name"
                    required
                  />
                  <div className="absolute left-0 bottom-0 w-0 h-[2px] bg-myth-gold group-hover:w-full transition-all duration-500"></div>
                </div>
                <div className="mt-4">
                  <label className="block text-myth-gold/80 text-xs font-bold mb-2 uppercase tracking-widest font-myth">
                    Secret Incantation (Password)
                  </label>
                <div className="relative group transition-all duration-300">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    className="w-full bg-myth-darker border border-myth-gold/30 rounded px-4 py-3.5 pr-12 text-myth-gold focus:outline-none focus:border-myth-gold focus:shadow-myth-gold transition-all duration-300 font-body hover:border-myth-gold/50 placeholder:text-gray-700 backdrop-blur-sm"
                    placeholder="Password"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-myth-gold/60 hover:text-myth-gold transition-colors"
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      </svg>
                    )}
                  </button>
                  <div className="absolute left-0 bottom-0 w-0 h-[2px] bg-myth-gold group-hover:w-full transition-all duration-500"></div>
                </div>
                </div>
              </div>
            ) : (
              <>
                <div className="animate-stagger-in" style={{ animationDelay: '0.1s', animationFillMode: 'backwards' }}>
                  <label className="block text-myth-red/80 text-xs font-bold mb-2 uppercase tracking-widest font-myth">
                    Username
                  </label>
                  <div className="relative group transition-all duration-300">
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoComplete="off"
                      className="w-full bg-myth-darker border border-myth-red/30 rounded px-4 py-3.5 text-myth-red focus:outline-none focus:border-myth-red focus:shadow-myth-red transition-all duration-300 font-body hover:border-myth-red/50 placeholder:text-gray-700 backdrop-blur-sm"
                      placeholder="Username"
                      required
                    />
                    <div className="absolute left-0 bottom-0 w-0 h-[2px] bg-myth-red group-hover:w-full transition-all duration-500"></div>
                  </div>
                </div>
                <div className="animate-stagger-in" style={{ animationDelay: '0.2s', animationFillMode: 'backwards' }}>
                  <label className="block text-myth-red/80 text-xs font-bold mb-2 uppercase tracking-widest font-myth">
                    Password
                  </label>
                  <div className="relative group transition-all duration-300">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      className="w-full bg-myth-darker border border-myth-red/30 rounded px-4 py-3.5 pr-12 text-myth-red focus:outline-none focus:border-myth-red focus:shadow-myth-red transition-all duration-300 font-body hover:border-myth-red/50 placeholder:text-gray-700 backdrop-blur-sm"
                      placeholder="Password"
                      required
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-myth-red/60 hover:text-myth-red transition-colors"
                    >
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        </svg>
                      )}
                    </button>
                    <div className="absolute left-0 bottom-0 w-0 h-[2px] bg-myth-red group-hover:w-full transition-all duration-500"></div>
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 rounded font-bold tracking-widest font-myth uppercase transition-all duration-500 overflow-hidden relative group hover-lift text-lg ${
                loading ? 'opacity-50 cursor-wait' : ''
              } ${
                !isAdmin 
                  ? 'bg-myth-gold/10 text-myth-gold border border-myth-gold hover:bg-myth-gold hover:text-obsidian hover:shadow-[0_0_40px_rgba(212,175,55,0.5)]' 
                  : 'bg-myth-red/10 text-myth-red border border-myth-red hover:bg-myth-red hover:text-obsidian hover:shadow-[0_0_40px_rgba(139,0,0,0.5)]'
              }`}
            >
              {/* Shimmer effect */}
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_ease-in-out_infinite]"></div>
              {loading ? (
                <span className="flex items-center justify-center gap-3">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  AUTHENTICATING...
                </span>
              ) : 'ENTER'}
            </button>
          </form>

          {/* Bottom decorative text */}
          <div className="mt-6 animate-fade-delayed" style={{ animationDelay: '1.5s' }}>
            <div className="flex items-center justify-center gap-2">
              <div className="w-8 h-px bg-gray-800"></div>
              <p className="text-gray-700 text-[10px] font-body tracking-[0.3em] uppercase">VULNI<span className="text-myth-red/40">X</span> 2.0 Debug Engine</p>
              <div className="w-8 h-px bg-gray-800"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

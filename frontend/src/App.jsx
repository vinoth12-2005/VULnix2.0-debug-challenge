import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Route-based code splitting (Lazy Loading)
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Challenge = lazy(() => import('./pages/Challenge'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const Admin = lazy(() => import('./pages/Admin'));

const ProtectedRoute = ({ children, requireAdmin }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (requireAdmin && user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
};

// Fallback loader for better UX
const DivineLoader = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-obsidian">
    <div className="w-16 h-16 border-4 border-myth-gold/20 border-t-myth-gold rounded-full animate-spin"></div>
    <div className="mt-4 font-myth text-myth-gold animate-pulse tracking-widest text-xs uppercase">Summoning Reality...</div>
  </div>
);

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Suspense fallback={<DivineLoader />}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/challenge/:id" element={<ProtectedRoute><Challenge /></ProtectedRoute>} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/admin" element={<ProtectedRoute requireAdmin={true}><Admin /></ProtectedRoute>} />
        <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="noise-overlay" />
        <div className="scanline" />
        <div className="cyber-grid" />
        
        {/* Ambient Glowing Orbs - Disabled on mobile for performance */}
        {!isMobile && (
          <>
            <div style={{ position: 'fixed', top: '25%', left: '25%', width: '24rem', height: '24rem', background: 'rgba(255,42,42,0.18)', borderRadius: '50%', filter: 'blur(100px)', animation: 'breathe 4s ease-in-out infinite', pointerEvents: 'none', zIndex: -10 }} />
            <div style={{ position: 'fixed', bottom: '25%', right: '25%', width: '31rem', height: '31rem', background: 'rgba(255,215,0,0.15)', borderRadius: '50%', filter: 'blur(120px)', animation: 'drift 6s ease-in-out infinite', pointerEvents: 'none', zIndex: -10 }} />
            <div style={{ position: 'fixed', top: '75%', left: '50%', transform: 'translateX(-50%)', width: '16rem', height: '16rem', background: 'rgba(255,42,42,0.1)', borderRadius: '50%', filter: 'blur(80px)', animation: 'pulse 3s ease-in-out infinite', pointerEvents: 'none', zIndex: -10 }} />
          </>
        )}

        <div className="relative z-10 w-full min-h-screen">
          <AppRoutes />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Challenge from './pages/Challenge';
import Leaderboard from './pages/Leaderboard';
import Admin from './pages/Admin';

const ProtectedRoute = ({ children, requireAdmin }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (requireAdmin && user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
};

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/challenge/:id" element={<ProtectedRoute><Challenge /></ProtectedRoute>} />
      <Route path="/leaderboard" element={<Leaderboard />} />
      <Route path="/admin" element={<ProtectedRoute requireAdmin={true}><Admin /></ProtectedRoute>} />
      <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="noise-overlay" />
        <div className="scanline" />
        <div className="cyber-grid" />
        
        {/* Ambient Glowing Orbs */}
        <div style={{ position: 'fixed', top: '25%', left: '25%', width: '24rem', height: '24rem', background: 'rgba(139,0,0,0.15)', borderRadius: '50%', filter: 'blur(100px)', animation: 'breathe 4s ease-in-out infinite', pointerEvents: 'none', zIndex: -10 }} />
        <div style={{ position: 'fixed', bottom: '25%', right: '25%', width: '31rem', height: '31rem', background: 'rgba(212,175,55,0.1)', borderRadius: '50%', filter: 'blur(120px)', animation: 'drift 6s ease-in-out infinite', pointerEvents: 'none', zIndex: -10 }} />
        <div style={{ position: 'fixed', top: '75%', left: '50%', transform: 'translateX(-50%)', width: '16rem', height: '16rem', background: 'rgba(139,0,0,0.1)', borderRadius: '50%', filter: 'blur(80px)', animation: 'pulse 3s ease-in-out infinite', pointerEvents: 'none', zIndex: -10 }} />

        <div className="relative z-10 w-full min-h-screen">
          <AppRoutes />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

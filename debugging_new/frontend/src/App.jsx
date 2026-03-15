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
        <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-[rgba(139,0,0,0.15)] rounded-full blur-[100px] animate-breathe pointer-events-none -z-10" />
        <div className="fixed bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[rgba(212,175,55,0.1)] rounded-full blur-[120px] animate-drift pointer-events-none -z-10" />
        <div className="fixed top-3/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-[rgba(139,0,0,0.1)] rounded-full blur-[80px] animate-pulse pointer-events-none -z-10" />

        <div className="relative z-10 w-full min-h-screen">
          <AppRoutes />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

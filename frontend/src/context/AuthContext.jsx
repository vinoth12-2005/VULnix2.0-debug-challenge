import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data.user);
        } catch (err) {
          console.error('Invalid token, logging out');
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const loginTeam = async (team_name, password) => {
    const res = await api.post('/auth/team-login', { team_name, password });
    localStorage.setItem('token', res.data.token);
    setUser({ ...res.data.team, role: res.data.role });
    return res.data;
  };

  const loginAdmin = async (username, password) => {
    const res = await api.post('/auth/admin-login', { username, password });
    localStorage.setItem('token', res.data.token);
    setUser({ ...res.data.admin, role: res.data.role });
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loginTeam, loginAdmin, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

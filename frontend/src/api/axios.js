import axios from 'axios';

// In local dev use localhost backend; in production (Vercel) use relative /api
const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';
const baseURL = isDev
  ? (import.meta.env.VITE_API_URL || 'http://localhost:5000/api')
  : '/api';

const api = axios.create({
  baseURL,
  timeout: 60000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      localStorage.removeItem('token');
    }
    return Promise.reject(error);
  }
);

export default api;

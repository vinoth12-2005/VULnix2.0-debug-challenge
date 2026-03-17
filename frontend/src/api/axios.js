import axios from 'axios';

// In local dev use localhost backend; in production (Vercel) use relative /api
// Prioritize VITE_API_URL from environment; fallback to localhost in dev or relative /api in prod
const baseURL = import.meta.env.VITE_API_URL 
  || (typeof window !== 'undefined' && window.location.hostname === 'localhost' 
      ? 'http://localhost:5000/api' 
      : '/api');

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

import axios from 'axios';

const isLocalhost = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const envURL = import.meta.env.VITE_API_URL;

// Determine final base URL
let baseURL = envURL;

if (!isLocalhost && envURL && envURL.includes('localhost')) {
  // If we are on a REAL domain but the env var says 'localhost', 
  // it means the build baked in a local .env file. Fallback to /api.
  baseURL = '/api';
} else if (!baseURL) {
  baseURL = isLocalhost ? 'http://localhost:5000/api' : '/api';
}

// Auto-upgrade to HTTPS if the main site is secure
if (typeof window !== 'undefined' && window.location.protocol === 'https:' && baseURL.startsWith('http:')) {
  if (!baseURL.includes('localhost')) {
    baseURL = baseURL.replace('http:', 'https:');
  }
}

const api = axios.create({
  baseURL,
  timeout: 60000,
});

if (isLocalhost) {
  console.log('📡 API BaseURL:', baseURL);
}

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

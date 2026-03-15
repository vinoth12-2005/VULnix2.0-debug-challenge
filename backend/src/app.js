const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const problemRoutes = require('./routes/problems');
const codeRoutes = require('./routes/code');
const leaderboardRoutes = require('./routes/leaderboard');
const submissionRoutes = require('./routes/submissions');
const adminRoutes = require('./routes/admin');
const helmet = require('helmet');

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.set('io', io);

// Security Middleware
app.use(helmet()); // Secure HTTP headers

// Custom XSS Sanitizer Middleware (replacement for incompatible xss-clean)
const xss = require('xss');
app.use((req, res, next) => {
  const sanitize = (data) => {
    if (typeof data === 'string') return xss(data);
    if (Array.isArray(data)) return data.map(sanitize);
    if (typeof data === 'object' && data !== null) {
      return Object.keys(data).reduce((acc, key) => {
        acc[key] = sanitize(data[key]);
        return acc;
      }, {});
    }
    return data;
  };
  if (req.body) req.body = sanitize(req.body);
  if (req.query) req.query = sanitize(req.query);
  if (req.params) req.params = sanitize(req.params);
  next();
});

// Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://vu-lnix2-0-debug-challenge.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || allowedOrigins.length === 0) {
      return callback(null, true);
    }
    // In production allow all *.vercel.app subdomains
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    return callback(null, true); // Fallback: allow all (safe for public API)
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' })); // Restricted body size

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 500, // 100 users * 5 reqs/window
  message: { message: 'Divine flow restricted. Too many requests, try again later.' },
});
app.use('/api/', apiLimiter);

// Code execution stricter rate limit
const codeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { message: 'Too many code executions. Please wait.' },
});
app.use('/api/code/', codeLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/code', codeRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Socket.io
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);
  socket.on('disconnect', () => console.log(`Socket disconnected: ${socket.id}`));
});

module.exports = { app, httpServer };

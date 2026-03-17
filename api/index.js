// Vercel Serverless Entry Point
// This file exports the Express app as a serverless function.
// Socket.io is NOT supported in Vercel serverless — HTTP routes work fine.

const path = require('path');
// In Vercel, platform env vars are used. Locally, it fallbacks to backend/.env
require('dotenv').config(); 
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: path.resolve(__dirname, '../backend/.env') });
}

const { app } = require('../backend/src/app');

module.exports = app;

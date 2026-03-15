// Vercel Serverless Entry Point
// This file exports the Express app as a serverless function.
// Socket.io is NOT supported in Vercel serverless — HTTP routes work fine.

const path = require('path');
// Load environment variables from .env file (used in local dev, Vercel uses dashboard env vars)
require('dotenv').config({ path: path.resolve(__dirname, '../backend/.env') });

const { app } = require('../backend/src/app');

module.exports = app;

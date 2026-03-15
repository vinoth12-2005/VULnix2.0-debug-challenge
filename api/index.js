// Vercel Serverless Entry Point
// This file exports the Express app as a serverless function.
// Socket.io is NOT supported in Vercel serverless — HTTP routes work fine.

const { app } = require('../backend/src/app');

module.exports = app;

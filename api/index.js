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
const pool = require('../backend/src/config/database');

// Database auto-initialization for Vercel Serverless
async function autoInitDatabase() {
  const dbHost = process.env.MYSQLHOST || process.env.DB_HOST;
  if (!dbHost) {
    console.warn('⚠️ DB_HOST is not configured. Skipping database auto-initialization.');
    return;
  }
  try {
    console.log('🔍 Checking database status...');
    const [tables] = await pool.query('SHOW TABLES');
    if (tables.length === 0) {
      console.log('🌱 Database is empty! Initializing schema...');
      const fs = require('fs');
      const schemaPath = path.resolve(__dirname, '../backend/src/config/schema.sql');
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      
      const statements = schemaSql
        .replace(/CREATE DATABASE IF NOT EXISTS [a-zA-Z0-9_]+;/gi, '')
        .replace(/USE [a-zA-Z0-9_]+;/gi, '')
        .split(';')
        .map(s => s.trim())
        .filter(Boolean);
        
      for (const statement of statements) {
        await pool.query(statement);
      }
      console.log('✅ Database schema initialized.');

      console.log('🌱 Seeding initial data (problems, admin, teams)...');
      const { seed } = require('../backend/src/config/seed');
      await seed();
      console.log('🎉 Database initialization and seeding completed successfully!');
    } else {
      console.log(`✅ Database already has ${tables.length} tables. Skipping initialization.`);
    }
  } catch (err) {
    console.error('❌ Database auto-initialization failed:', err);
  }
}

// Trigger database check immediately
autoInitDatabase();

// Deployment Health Check Log
if (process.env.NODE_ENV === 'production') {
  console.log('--- VERCEL DEPLOYMENT INFO ---');
  console.log('DB_HOST configured:', !!process.env.DB_HOST);
  console.log('DB_NAME:', process.env.DB_NAME);
  if (!process.env.DB_HOST) {
    console.error('❌ CRITICAL: DB_HOST is missing in environment!');
  }
}

module.exports = app;

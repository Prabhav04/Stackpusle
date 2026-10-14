import dotenv from 'dotenv';
import path from 'path';

// Load parent .env if available, then local .env
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config();

export const env = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/stackpulse?schema=public',
  SESSION_SECRET: process.env.SESSION_SECRET || 'stackpulse-development-session-secret-key-32chars',
  GITHUB_TOKEN: process.env.GITHUB_TOKEN || '',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
};

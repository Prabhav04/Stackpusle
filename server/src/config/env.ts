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

if (!env.GITHUB_TOKEN) {
  console.warn(
    '\n\x1b[41m\x1b[37m[WARNING]\x1b[0m \x1b[33mGITHUB_TOKEN is not set in environment!\x1b[0m'
  );
  console.warn(
    '\x1b[33mUnauthenticated GitHub API calls are limited to 60 requests/hour and will quickly exhaust during live comparisons. Set GITHUB_TOKEN in your .env to raise limits to 5,000 req/hr.\x1b[0m\n'
  );
}

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import { PrismaSessionStore } from '@quixo3/prisma-session-store';
import { env } from './config/env.js';
import { prisma } from './config/prisma.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requireAuth } from './middleware/auth.js';
import * as authController from './controllers/authController.js';
import * as developerController from './controllers/developerController.js';
import * as compareController from './controllers/compareController.js';
import * as pinController from './controllers/pinController.js';

export function createApp(): express.Application {
  const app = express();

  // Helmet HTTP security headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // Allow frontend resources and Vite dev
      crossOriginEmbedderPolicy: false,
    })
  );

  // Exact CORS origins with credentials enabled
  const allowedOrigins = [env.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'].filter(Boolean);
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, or server-to-server tests)
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`Origin ${origin} not allowed by StackPulse CORS policy`));
        }
      },
      credentials: true,
    })
  );

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Session middleware backed by PostgreSQL through Prisma
  app.use(
    session({
      name: 'stackpulse.sid',
      cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
      },
      secret: env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      store: new PrismaSessionStore(prisma, {
        checkPeriod: 2 * 60 * 1000,
        dbRecordIdIsSessionId: true,
      }),
    })
  );

  // Rate limiter on login and register to prevent brute-force attacks
  const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30, // 30 requests per 15 minutes per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many authentication attempts. Please try again in 15 minutes.',
      },
    },
  });

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'stackpulse-api',
    });
  });

  // Auth Routes (with rate limiting on register and login)
  app.post('/api/auth/register', authRateLimiter, authController.register);
  app.post('/api/auth/login', authRateLimiter, authController.login);
  app.post('/api/auth/logout', requireAuth, authController.logout);
  app.get('/api/auth/me', authController.getCurrentUser);

  // Developer Routes
  app.get('/api/developers/recent', requireAuth, developerController.getRecentViews);
  app.get('/api/developers/:username', requireAuth, developerController.getDeveloper);

  // Compare & Saved Comparisons Routes
  app.get('/api/compare', requireAuth, compareController.compareDevelopers);
  app.get('/api/comparisons', requireAuth, compareController.getSavedComparisons);
  app.post('/api/comparisons', requireAuth, compareController.saveComparison);
  app.get('/api/comparisons/:id', requireAuth, compareController.getComparisonById);
  app.delete('/api/comparisons/:id', requireAuth, compareController.deleteComparison);

  // Pinned Repositories Routes
  app.get('/api/pins', requireAuth, pinController.getPins);
  app.post('/api/pins', requireAuth, pinController.createPin);
  app.patch('/api/pins/:id', requireAuth, pinController.updatePin);
  app.delete('/api/pins/:id', requireAuth, pinController.deletePin);

  // 404 handler for unknown API routes
  app.use('/api/*', (_req, res) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Endpoint not found',
      },
    });
  });

  // Centralized Error Handling Middleware (no stack traces leak)
  app.use(errorHandler);

  return app;
}

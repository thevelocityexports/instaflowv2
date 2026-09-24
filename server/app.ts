/**
 * Express Application Configuration
 * Exports configured Express app for both standalone Node server and Vercel Serverless Functions.
 */

import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

import automationRoutes from './routes/automationRoutes';
import { commentRoutes, logRoutes, dashboardRoutes } from './routes/commentRoutes';
import instagramRoutes from './routes/instagramRoutes';
import webhookRoutes from './routes/webhookRoutes';
import testRoutes from './routes/testRoutes';
import authRoutes from './routes/authRoutes';
import { databaseRouter } from './routes/databaseRoutes';
import { LoggingService } from './services/loggingService';

dotenv.config();

export const app = express();

app.use(cors());

// Middleware to normalize req.url and req.body for serverless / Vercel proxying
app.use((req: Request, _res: Response, next: NextFunction) => {
  // If Vercel rewrote request to /api or /, restore path from headers if available
  const matchedPath = (req.headers['x-matched-path'] as string) || (req.headers['x-forwarded-uri'] as string);
  if (matchedPath && (req.url === '/' || req.url === '/api' || req.url.startsWith('/?') || req.url.startsWith('/api?'))) {
    const queryIdx = req.url.indexOf('?');
    const queryString = queryIdx !== -1 ? req.url.slice(queryIdx) : '';
    req.url = matchedPath + queryString;
  }

  // If body is already parsed by serverless runtime, prevent body-parser from stalling
  if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
    (req as any)._body = true;
  }
  next();
});

// Capture raw body for Meta Webhook HMAC-SHA256 signature verification
app.use(
  express.json({
    verify: (req: Request & { rawBody?: Buffer }, _res: Response, buf: Buffer) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true }));

// Webhook direct challenge check on root or /api in case path was collapsed
app.get(['/api', '/'], (req: Request, res: Response, next: NextFunction) => {
  if (req.query['hub.mode'] || req.query['hub_mode'] || req.query['mode']) {
    return (webhookRoutes as any)(req, res, next);
  }
  next();
});

// Health check endpoints (Always return 200 OK)
app.get(['/api/health', '/health', '/healthz'], (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'InstaFlow Engine',
    timestamp: new Date().toISOString(),
  });
});

// REST API Endpoints - mounted with both /api and without /api so serverless rewrites always resolve
app.use(['/api/automations', '/automations'], automationRoutes);
app.use(['/api/instagram', '/instagram'], instagramRoutes);
app.use(['/api/comments', '/comments'], commentRoutes);
app.use(['/api/logs', '/logs'], logRoutes);
app.use(['/api/dashboard', '/dashboard'], dashboardRoutes);
app.use(['/api/webhooks', '/api/webhook', '/webhooks', '/webhook'], webhookRoutes);
app.use(['/api/instagram/webhook', '/instagram/webhook'], webhookRoutes);
app.use(['/api/test', '/test'], testRoutes);
app.use(['/api/auth', '/auth'], authRoutes);
app.use(['/api/database', '/database'], databaseRouter);

// Forward root /api aliases directly to instagramRoutes (e.g. /api/connect-account, /api/connect)
app.use('/api', instagramRoutes);

// Explicit JSON 404 for unhandled /api and webhook routes to prevent raw HTML 404 errors
app.all(['/api/*', '/webhooks/*', '/webhook/*'], (req: Request, res: Response) => {
  res.status(404).json({
    error: `API route not found: ${req.method} ${req.originalUrl}`,
    message: `The endpoint ${req.method} ${req.path} does not exist on this server.`,
  });
});

// Centralized error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  LoggingService.error('Unhandled server error', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred. Please try again.',
  });
});

export default app;

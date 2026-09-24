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

// Capture raw body for Meta Webhook HMAC-SHA256 signature verification
app.use(
  express.json({
    verify: (req: Request & { rawBody?: Buffer }, _res: Response, buf: Buffer) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true }));

// Health check endpoints (Always return 200 OK)
app.get(['/api/health', '/health', '/healthz'], (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'InstaFlow Engine',
    timestamp: new Date().toISOString(),
  });
});

// REST API Endpoints
app.use('/api/automations', automationRoutes);
app.use('/api/instagram', instagramRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use(['/api/webhooks', '/api/webhook', '/webhooks', '/webhook'], webhookRoutes);
app.use('/api/instagram/webhook', webhookRoutes);
app.use('/api/test', testRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/database', databaseRouter);

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

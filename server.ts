/**
 * Main Full-Stack Application Server
 * Serves REST API routes for InstaFlow and mounts Vite development middleware.
 */

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import cors from 'cors';

import automationRoutes from './server/routes/automationRoutes';
import commentRoutes from './server/routes/commentRoutes';
import instagramRoutes from './server/routes/instagramRoutes';
import webhookRoutes from './server/routes/webhookRoutes';
import testRoutes from './server/routes/testRoutes';
import authRoutes from './server/routes/authRoutes';
import { databaseRouter } from './server/routes/databaseRoutes';
import { LoggingService } from './server/services/loggingService';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

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

// REST API Endpoints
app.use('/api/automations', automationRoutes);
app.use('/api/instagram', instagramRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/logs', commentRoutes);
app.use('/api/dashboard', commentRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/test', testRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/database', databaseRouter);

// Root fallback aliases for Instagram connection
app.post(['/api/connect-account', '/api/connect', '/api/direct-connect'], (req, res, next) => {
  req.url = '/connect-account';
  instagramRoutes(req, res, next);
});

// Explicit JSON 404 for unhandled /api routes to prevent raw HTML 404 errors
app.all('/api/*', (req: Request, res: Response) => {
  res.status(404).json({
    error: `API route not found: ${req.method} ${req.originalUrl}`,
    message: `The endpoint ${req.method} ${req.path} does not exist on this server.`,
  });
});

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'InstaFlow Engine',
    timestamp: new Date().toISOString(),
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

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    // Development mode with Vite middleware mounted
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    // Fallback for HTML5 client-side routing in dev mode
    app.use('*', async (req: Request, res: Response, next: NextFunction) => {
      // Don't intercept API endpoints or static asset requests with file extensions
      if (req.originalUrl.startsWith('/api') || path.extname(req.originalUrl)) {
        return next();
      }
      try {
        const fs = await import('fs');
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    LoggingService.info(`InstaFlow Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  LoggingService.error('Failed to start server', err);
  process.exit(1);
});

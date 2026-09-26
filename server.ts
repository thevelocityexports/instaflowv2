/**
 * Main Full-Stack Application Server
 * Serves REST API routes for InstaFlow and mounts Vite development middleware.
 */

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import { app } from './server/app';
import { LoggingService } from './server/services/loggingService';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req: Request, res: Response) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    } else {
      // Standalone backend container mode (decoupled from frontend static build)
      app.get('/', (_req: Request, res: Response) => {
        res.status(200).json({
          status: 'ok',
          service: 'InstaFlow Cloud Run API Engine',
          timestamp: new Date().toISOString(),
        });
      });
    }
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
      // Don't intercept API endpoints, webhooks, or static asset requests with file extensions
      if (
        req.originalUrl.startsWith('/api') ||
        req.originalUrl.startsWith('/webhooks') ||
        req.originalUrl.startsWith('/webhook') ||
        path.extname(req.originalUrl)
      ) {
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

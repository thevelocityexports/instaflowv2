/**
 * Vercel Serverless Function Entrypoint
 * Handles /api root, health checks, and proxied requests
 */

import { app } from '../server/app';

export default function handler(req: any, res: any) {
  return app(req, res);
}

export { app };

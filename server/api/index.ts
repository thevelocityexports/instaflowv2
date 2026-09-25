/**
 * Vercel Serverless Function Entrypoint Source
 * Bundled into api/index.js during build
 */

import { app } from '../app';

export default function handler(req: any, res: any) {
  // If invoked as a serverless function with query path parameters
  if (req.query?.__path) {
    const p = req.query.__path as string;
    req.url = p.startsWith('/') ? p : `/${p}`;
  }
  return app(req, res);
}

export { app };

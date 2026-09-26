/**
 * Vercel Serverless Function Entrypoint Source
 * Bundled into api/index.js during build
 */

import { app } from '../app';

export default function handler(req: any, res: any) {
  // If invoked as a serverless function with query path parameters
  if (req.query?.__path) {
    const p = req.query.__path as string;
    const cleanPath = p.startsWith('/') ? p : `/${p}`;
    const origUrl = req.url || '';
    const qIdx = origUrl.indexOf('?');
    const queryString = qIdx !== -1 ? origUrl.slice(qIdx) : '';
    req.url = cleanPath + queryString;
  }
  return app(req, res);
}

export { app };

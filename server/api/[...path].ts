/**
 * Vercel Serverless Function Catch-All Entrypoint Source
 * Handles all /api/* subpaths (e.g. /api/instagram/config, /api/webhooks/instagram)
 * Bundled into api/[...path].js during build
 */

import { app } from '../app';

export default function handler(req: any, res: any) {
  return app(req, res);
}

export { app };

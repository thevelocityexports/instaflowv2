/**
 * Vercel Serverless Function Catch-All Entrypoint
 * Handles all /api/* subpaths (e.g. /api/instagram/config, /api/webhooks/instagram, /api/automations)
 */

import { app } from '../server/app';

export default function handler(req: any, res: any) {
  return app(req, res);
}

export { app };

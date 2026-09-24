/**
 * Vercel Serverless Function Entrypoint Source
 * Bundled into api/index.js during build
 */

import { app } from '../app';

export default function handler(req: any, res: any) {
  return app(req, res);
}

export { app };

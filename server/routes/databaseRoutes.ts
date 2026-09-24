import { Router, Request, Response } from 'express';
import { databaseService } from '../services/databaseService';
import { LoggingService } from '../services/loggingService';

export const databaseRouter = Router();

/**
 * GET /api/database/status
 * Returns current database provider, connection status, and schema health
 */
databaseRouter.get('/status', async (req: Request, res: Response) => {
  try {
    const isUsingSupabase = databaseService.isUsingSupabaseDatabase();
    const supabaseUrlConfigured = !!process.env.SUPABASE_URL && !process.env.SUPABASE_URL.includes('MY_SUPABASE');
    const supabaseKeyConfigured = !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);

    let tablesVerified = false;
    let errorDetail = null;

    if (isUsingSupabase) {
      try {
        const client = databaseService.getSupabaseClient();
        if (client) {
          const { error } = await client.from('automations').select('id').limit(1);
          if (error) {
            errorDetail = error.message;
            tablesVerified = false;
          } else {
            tablesVerified = true;
          }
        }
      } catch (err: any) {
        errorDetail = err.message || 'Error querying Supabase tables';
      }
    }

    const url = process.env.SUPABASE_URL || '';
    const match = url.match(/https:\/\/([a-z0-9_-]+)\.supabase\.co/i);
    const projectId = match ? match[1] : null;

    return res.status(200).json({
      success: true,
      provider: isUsingSupabase ? 'supabase' : 'local_memory',
      isUsingSupabase,
      projectId,
      envConfig: {
        supabaseUrlConfigured,
        supabaseKeyConfigured,
      },
      tablesVerified,
      errorDetail,
      message: isUsingSupabase
        ? tablesVerified
          ? 'Connected to Supabase PostgreSQL and tables verified.'
          : `Connected to Supabase URL, but database tables may not be created yet. Error: ${errorDetail}`
        : 'Running in local dual-mode in-memory database. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to connect live Supabase.',
    });
  } catch (error: any) {
    LoggingService.error('Failed to check database status', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to verify database connection status',
    });
  }
});

import { Router, Request, Response } from 'express';
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
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

/**
 * POST /api/database/migrate
 * Automatically executes the full schema.sql migration on the user's Supabase project.
 * Supports:
 * 1. Database password -> direct pg connection to db.<projectId>.supabase.co:5432
 * 2. Supabase Personal Access Token (sbp_...) -> Supabase Management API
 */
databaseRouter.post('/migrate', async (req: Request, res: Response) => {
  try {
    const { password, accessToken } = req.body;
    const url = process.env.SUPABASE_URL || '';
    const match = url.match(/https:\/\/([a-z0-9_-]+)\.supabase\.co/i);
    const projectId = match ? match[1] : null;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: 'SUPABASE_URL is not configured.',
      });
    }

    let sqlContent = '';
    const possiblePaths = [
      path.resolve(process.cwd(), 'server', 'db', 'schema.sql'),
      path.resolve(process.cwd(), 'dist', 'server', 'db', 'schema.sql'),
      path.resolve(__dirname, '..', 'db', 'schema.sql'),
      path.resolve(__dirname, 'schema.sql'),
    ];
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        sqlContent = fs.readFileSync(p, 'utf-8');
        break;
      }
    }

    if (!sqlContent) {
      return res.status(500).json({
        success: false,
        error: 'schema.sql migration file could not be located on server. Please use the SQL Schema copy button in Settings to run migrations manually.',
      });
    }

    // Method 1: Supabase Personal Access Token
    if (accessToken) {
      try {
        const response = await fetch(`https://api.supabase.com/v1/projects/${projectId}/database/query`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken.trim()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: sqlContent }),
        });
        const data = (await response.json()) as any;
        if (!response.ok) {
          return res.status(400).json({
            success: false,
            error: data?.message || 'Supabase Management API query execution failed.',
          });
        }
        return res.status(200).json({
          success: true,
          message: 'Migration executed successfully via Supabase Management API!',
        });
      } catch (err: any) {
        return res.status(500).json({
          success: false,
          error: `Management API call error: ${err.message}`,
        });
      }
    }

    // Method 2: Direct PostgreSQL database password
    if (password) {
      const client = new Client({
        host: `db.${projectId}.supabase.co`,
        port: 5432,
        database: 'postgres',
        user: 'postgres',
        password: String(password).trim(),
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 12000,
      });

      try {
        await client.connect();
        await client.query(sqlContent);

        // Instruct PostgREST to reload its schema cache
        try {
          await client.query("NOTIFY pgrst, 'reload schema';");
        } catch (_) {}

        await client.end();
        return res.status(200).json({
          success: true,
          message: 'All Supabase database tables created & verified successfully!',
        });
      } catch (err: any) {
        try {
          await client.end();
        } catch (_) {}
        LoggingService.error('Direct PostgreSQL migration failed', err);
        return res.status(400).json({
          success: false,
          error: `PostgreSQL connection error: ${err.message}. Please double-check your database password.`,
        });
      }
    }

    return res.status(400).json({
      success: false,
      error: 'Please provide your Supabase database password to run the migration automatically.',
    });
  } catch (error: any) {
    LoggingService.error('Migration execution failed', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error during migration',
    });
  }
});


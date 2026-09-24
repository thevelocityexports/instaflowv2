import { Router, Response } from 'express';
import { databaseService } from '../services/databaseService';
import { AuthService, AuthenticatedRequest } from '../services/authService';
import { LoggingService } from '../services/loggingService';

// Comments Router (/api/comments)
export const commentRoutes = Router();
commentRoutes.use(AuthService.requireAuth);

commentRoutes.get(['/', '/comments'], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { status, search, limit } = req.query;

    const logs = await databaseService.getLogs(req.user!.id, {
      status: status as string,
      search: search as string,
      limit: limit ? parseInt(limit as string, 10) : 100,
    });

    res.json({ comments: logs });
  } catch (err) {
    LoggingService.error('Error fetching comments', err);
    res.status(500).json({ error: 'Failed to retrieve comments', comments: [] });
  }
});

// Logs Router (/api/logs)
export const logRoutes = Router();
logRoutes.use(AuthService.requireAuth);

logRoutes.get(['/', '/logs'], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const logs = await databaseService.getLogs(req.user!.id, {
      limit: 150,
    });
    res.json({ logs });
  } catch (err) {
    LoggingService.error('Error fetching logs', err);
    res.status(500).json({ error: 'Failed to retrieve logs', logs: [] });
  }
});

// Dashboard Router (/api/dashboard)
export const dashboardRoutes = Router();
dashboardRoutes.use(AuthService.requireAuth);

dashboardRoutes.get(['/', '/stats', '/dashboard/stats'], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const stats = await databaseService.getDashboardStats(req.user!.id);
    const recentActivity = await databaseService.getLogs(req.user!.id, { limit: 10 });

    res.json({
      stats,
      recentActivity,
    });
  } catch (err) {
    LoggingService.error('Error fetching dashboard stats', err);
    res.status(500).json({
      error: 'Failed to retrieve stats',
      stats: {
        totalAutomations: 0,
        activeAutomations: 0,
        commentsProcessed: 0,
        successfulReplies: 0,
        successfulDMs: 0,
      },
      recentActivity: [],
    });
  }
});

export default commentRoutes;


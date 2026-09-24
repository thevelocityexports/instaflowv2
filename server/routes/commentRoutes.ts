import { Router, Response } from 'express';
import { databaseService } from '../services/databaseService';
import { AuthService, AuthenticatedRequest } from '../services/authService';
import { LoggingService } from '../services/loggingService';

const router = Router();

router.use(AuthService.requireAuth);

/**
 * GET /api/comments
 * Returns comment execution logs formatted for Comments page
 */
router.get(['/', '/comments'], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
    res.status(500).json({ error: 'Failed to retrieve comments' });
  }
});

/**
 * GET /api/logs
 * Returns raw audit execution logs
 */
router.get(['/', '/logs'], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const logs = await databaseService.getLogs(req.user!.id, {
      limit: 150,
    });
    res.json({ logs });
  } catch (err) {
    LoggingService.error('Error fetching logs', err);
    res.status(500).json({ error: 'Failed to retrieve logs' });
  }
});

/**
 * GET /api/dashboard/stats
 * Aggregates statistics for the SaaS dashboard
 */
router.get(['/', '/stats', '/dashboard/stats'], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const stats = await databaseService.getDashboardStats(req.user!.id);
    const recentActivity = await databaseService.getLogs(req.user!.id, { limit: 10 });

    res.json({
      stats,
      recentActivity,
    });
  } catch (err) {
    LoggingService.error('Error fetching dashboard stats', err);
    res.status(500).json({ error: 'Failed to retrieve stats' });
  }
});

export default router;

import { Router, Response } from 'express';
import { databaseService } from '../services/databaseService';
import { AuthService, AuthenticatedRequest } from '../services/authService';
import { LoggingService } from '../services/loggingService';

const router = Router();

// Apply auth middleware
router.use(AuthService.requireAuth);

/**
 * GET /api/automations
 * Returns all automations belonging to authenticated user
 */
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const automations = await databaseService.getAutomations(req.user!.id);
    res.json({ automations });
  } catch (err) {
    LoggingService.error('Error fetching automations', err);
    res.status(500).json({ error: 'Failed to retrieve automations' });
  }
});

/**
 * GET /api/automations/:id
 */
router.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const automation = await databaseService.getAutomationById(req.params.id);
    if (!automation || automation.userId !== req.user!.id) {
      res.status(404).json({ error: 'Automation not found' });
      return;
    }
    res.json({ automation });
  } catch (err) {
    LoggingService.error('Error fetching automation', err);
    res.status(500).json({ error: 'Failed to retrieve automation' });
  }
});

/**
 * POST /api/automations
 * Creates a new automation
 */
router.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      name,
      instagramAccountId,
      targetPostType = 'all',
      targetPostId,
      targetPostCaption,
      matchType = 'contains',
      keywords = [],
      actions = [],
    } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ error: 'Automation name is required' });
      return;
    }

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      res.status(400).json({ error: 'At least one keyword is required' });
      return;
    }

    // Ensure at least one action is enabled
    const hasEnabledAction = actions.some(
      (a: { isEnabled: boolean; messageTemplate: string }) => a.isEnabled && a.messageTemplate?.trim()
    );

    if (!hasEnabledAction) {
      res.status(400).json({
        error: 'Please enable and provide a message for at least one action (Public Reply or Private DM)',
      });
      return;
    }

    // Default to user's connected account or auto-create active account
    let accountId = instagramAccountId;
    if (!accountId) {
      let connectedAcc = await databaseService.getConnectedInstagramAccount(req.user!.id);
      if (!connectedAcc) {
        // Auto-create/attach account on the fly so saving automation never crashes
        connectedAcc = await databaseService.upsertInstagramAccount(req.user!.id, {
          username: 'panchalohajewels',
          name: 'Panchaloha Jewels',
        });
      }
      accountId = connectedAcc.id;
    }

    const created = await databaseService.createAutomation({
      userId: req.user!.id,
      instagramAccountId: accountId,
      name: name.trim(),
      isActive: true,
      triggerType: 'comment',
      targetPostType,
      targetPostId,
      targetPostCaption,
      matchType: matchType === 'exact' ? 'exact' : 'contains',
      keywords: keywords.map((k: string) => k.trim()).filter(Boolean),
      actions,
    });

    res.status(201).json({ automation: created });
  } catch (err) {
    LoggingService.error('Error creating automation', err);
    res.status(500).json({ error: 'Failed to create automation' });
  }
});

/**
 * PUT /api/automations/:id
 * Updates an existing automation
 */
router.put('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const updated = await databaseService.updateAutomation(req.params.id, req.user!.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Automation not found or unauthorized' });
      return;
    }
    res.json({ automation: updated });
  } catch (err) {
    LoggingService.error('Error updating automation', err);
    res.status(500).json({ error: 'Failed to update automation' });
  }
});

/**
 * POST /api/automations/:id/toggle
 * Enables or disables an automation
 */
router.post('/:id/toggle', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const toggled = await databaseService.toggleAutomation(req.params.id, req.user!.id);
    if (!toggled) {
      res.status(404).json({ error: 'Automation not found' });
      return;
    }
    res.json({ automation: toggled });
  } catch (err) {
    LoggingService.error('Error toggling automation', err);
    res.status(500).json({ error: 'Failed to toggle automation' });
  }
});

/**
 * POST /api/automations/:id/duplicate
 */
router.post('/:id/duplicate', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const duplicated = await databaseService.duplicateAutomation(req.params.id, req.user!.id);
    if (!duplicated) {
      res.status(404).json({ error: 'Automation not found' });
      return;
    }
    res.json({ automation: duplicated });
  } catch (err) {
    LoggingService.error('Error duplicating automation', err);
    res.status(500).json({ error: 'Failed to duplicate automation' });
  }
});

/**
 * DELETE /api/automations/:id
 */
router.delete('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const success = await databaseService.deleteAutomation(req.params.id, req.user!.id);
    if (!success) {
      res.status(404).json({ error: 'Automation not found' });
      return;
    }
    res.json({ success: true, message: 'Automation deleted successfully' });
  } catch (err) {
    LoggingService.error('Error deleting automation', err);
    res.status(500).json({ error: 'Failed to delete automation' });
  }
});

export default router;

import { Router, Response } from 'express';
import { AutomationService } from '../services/automationService';
import { databaseService } from '../services/databaseService';
import { AuthService, AuthenticatedRequest } from '../services/authService';
import { LoggingService } from '../services/loggingService';
import { NormalizedCommentEvent } from '../../shared/types';

const router = Router();

router.use(AuthService.requireAuth);

/**
 * POST /api/test/comment
 * Executes the EXACT SAME AutomationService.processComment engine with test mode flags
 */
router.post('/comment', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      username = 'test_shopper',
      commentText,
      automationId,
      postId,
    } = req.body;

    if (!commentText || !commentText.trim()) {
      res.status(400).json({ error: 'Comment text is required' });
      return;
    }

    // Resolve user's Instagram account
    const connectedAccount = await databaseService.getConnectedInstagramAccount(req.user!.id);
    const accountId = connectedAccount ? connectedAccount.id : 'ig_acc_01';

    const testEventId = `test_comment_${Date.now()}`;
    const testUserId = `test_user_${Math.floor(1000 + Math.random() * 9000)}`;

    const normalizedEvent: NormalizedCommentEvent = {
      platform: 'instagram',
      accountId,
      commentId: testEventId,
      userId: testUserId,
      username: username.replace(/^@/, '').trim() || 'test_shopper',
      commentText: commentText.trim(),
      postId: postId || 'post_sample_01',
      timestamp: new Date().toISOString(),
      isTestMode: true, // Clearly marks this as TEST MODE
    };

    LoggingService.info(`[TEST MODE] Triggering mock comment event for @${normalizedEvent.username}: "${normalizedEvent.commentText}"`);

    // Run the SAME automation engine as real webhooks
    const result = await AutomationService.processComment(normalizedEvent);

    res.json({
      success: true,
      mode: 'TEST MODE',
      event: normalizedEvent,
      result,
      message: result.actionsExecuted > 0
        ? `Successfully matched and executed ${result.actionsExecuted} test action(s)!`
        : 'Comment processed, but no active automation keywords matched.',
    });
  } catch (err) {
    LoggingService.error('Error during test comment execution', err);
    res.status(500).json({ error: 'Failed to process test comment' });
  }
});

export default router;

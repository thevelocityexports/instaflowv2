import { Router, Request, Response } from 'express';
import { WebhookService } from '../services/webhookService';
import { LoggingService } from '../services/loggingService';

const router = Router();

/**
 * GET /api/webhooks/instagram
 * Handles Meta Webhook Verification challenge
 */
router.get('/instagram', (req: Request, res: Response): void => {
  const mode = req.query['hub.mode'] as string;
  const token = req.query['hub.verify_token'] as string;
  const challenge = req.query['hub.challenge'] as string;

  const result = WebhookService.verifyWebhook(mode, token, challenge);

  if (result.isValid && result.challenge) {
    // Return challenge as text/plain
    res.status(200).send(result.challenge);
  } else {
    res.status(403).json({
      error: 'Forbidden',
      message: result.error || 'Webhook verification token failed',
    });
  }
});

/**
 * POST /api/webhooks/instagram
 * Receives and processes real-time Instagram webhook comment events
 */
router.post('/instagram', async (req: Request, res: Response): Promise<void> => {
  const signature = req.headers['x-hub-signature-256'] as string;
  const rawBody = (req as unknown as { rawBody?: string | Buffer }).rawBody || JSON.stringify(req.body);

  // Validate Meta cryptographic signature
  const isSignatureValid = WebhookService.verifySignature(rawBody, signature);
  if (!isSignatureValid) {
    res.status(401).json({ error: 'Invalid webhook signature' });
    return;
  }

  // Acknowledge receipt to Meta immediately (200 OK) so Meta does not retry
  res.status(200).json({ status: 'EVENT_RECEIVED' });

  // Process comments asynchronously without crashing
  try {
    const results = await WebhookService.handleWebhookPayload(req.body);
    LoggingService.info(`Webhook processed ${results.length} comment events`);
  } catch (err) {
    LoggingService.error('Unhandled error during webhook event processing', err);
  }
});

export default router;

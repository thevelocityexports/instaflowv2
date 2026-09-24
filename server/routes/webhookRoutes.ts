import { Router, Request, Response } from 'express';
import { WebhookService } from '../services/webhookService';
import { InstagramService } from '../services/instagramService';
import { LoggingService } from '../services/loggingService';

const router = Router();

/**
 * Flexible GET Handler for Meta Webhook Verification
 * Supports /instagram, /, and trailing slashes
 */
const handleWebhookGet = (req: Request, res: Response): void => {
  const mode = (req.query['hub.mode'] || req.query['hub_mode'] || req.query['mode']) as string;
  const token = (req.query['hub.verify_token'] || req.query['hub_verify_token'] || req.query['verify_token']) as string;
  const challenge = (req.query['hub.challenge'] || req.query['hub_challenge'] || req.query['challenge']) as string;

  // Direct browser check without Meta query parameters
  if (!mode && !token && !challenge) {
    const config = InstagramService.getConfigStatus();
    res.status(200).json({
      status: 'online',
      service: 'InstaFlow Instagram Webhook Receiver',
      message: 'This Webhook Callback URL is active and listening for Meta verification challenges.',
      verifyToken: config.verifyToken,
      acceptedPaths: [
        '/api/webhooks/instagram',
        '/api/webhook/instagram',
        '/webhooks/instagram',
      ],
      instructions: 'Paste this URL into Meta Developers → Webhooks → Instagram → Callback URL, and enter the Verify Token.',
    });
    return;
  }

  const result = WebhookService.verifyWebhook(mode, token, challenge);

  if (result.isValid && result.challenge) {
    LoggingService.info(`Responding to Meta challenge with HTTP 200: ${result.challenge}`);
    // Plain text is strictly required by Meta
    res.status(200).type('text/plain').send(result.challenge);
  } else {
    LoggingService.warn(`Meta verification failed. Mode: ${mode}, Token: ${token}`);
    res.status(403).json({
      error: 'Forbidden',
      message: result.error || 'Webhook verification token failed',
      received: {
        mode: mode || null,
        verifyTokenReceived: Boolean(token),
        challengeReceived: Boolean(challenge),
      },
    });
  }
};

/**
 * Flexible POST Handler for Meta Webhook Events
 */
const handleWebhookPost = async (req: Request, res: Response): Promise<void> => {
  const signature = (req.headers['x-hub-signature-256'] || req.headers['x-hub-signature']) as string;
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
};

// Register on multiple URL path aliases so user input variations in Meta always match
router.get(['/instagram', '/instagram/', '/', ''], handleWebhookGet);
router.post(['/instagram', '/instagram/', '/', ''], handleWebhookPost);

/**
 * POST /api/webhooks/test-verify
 * In-app tester to diagnose and verify the webhook challenge locally
 */
router.post('/test-verify', (req: Request, res: Response): void => {
  const customToken = req.body?.verifyToken || InstagramService.getVerifyToken();
  const testChallenge = `challenge_test_${Date.now()}`;
  
  const result = WebhookService.verifyWebhook('subscribe', customToken, testChallenge);
  
  res.json({
    success: result.isValid,
    simulatedChallenge: testChallenge,
    responseReceived: result.challenge || null,
    error: result.error || null,
    testedToken: customToken,
    configuredToken: InstagramService.getVerifyToken(),
    message: result.isValid
      ? '✓ Webhook verification algorithm succeeded! Responds 200 OK with challenge.'
      : `Verification failed: ${result.error}`,
  });
});

export default router;

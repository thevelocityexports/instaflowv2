import { Router, Response } from 'express';
import { databaseService } from '../services/databaseService';
import { InstagramService } from '../services/instagramService';
import { AuthService, AuthenticatedRequest } from '../services/authService';
import { LoggingService } from '../services/loggingService';

const router = Router();

/**
 * GET /api/instagram/config-status
 * Returns public configuration readiness of Meta Developer app
 */
router.get('/config-status', (_req, res) => {
  const status = InstagramService.getConfigStatus();
  res.json({ config: status });
});

/**
 * GET /api/instagram/accounts
 */
router.get('/accounts', AuthService.requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const accounts = await databaseService.getInstagramAccounts(req.user!.id);
    res.json({ accounts });
  } catch (err) {
    LoggingService.error('Error fetching Instagram accounts', err);
    res.status(500).json({ error: 'Failed to retrieve Instagram accounts' });
  }
});

/**
 * GET /api/instagram/connect
 * Initiates Meta OAuth flow by redirecting to Meta OAuth dialog
 */
router.get('/connect', AuthService.requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { url, isConfigured } = InstagramService.getOAuthAuthorizeUrl(`user_${req.user!.id}`);

    if (!isConfigured) {
      res.status(400).json({
        error: 'Requires Meta Developer configuration',
        message: 'META_APP_ID is not configured in your environment secrets. Please configure your Meta App credentials in Settings to connect a real Instagram account.',
      });
      return;
    }

    res.redirect(url);
  } catch (err) {
    LoggingService.error('Error generating Instagram OAuth URL', err);
    res.status(500).json({ error: 'Failed to initiate Instagram connection' });
  }
});

/**
 * GET /api/instagram/callback
 * Handles OAuth redirect from Meta
 */
router.get('/callback', async (req, res): Promise<void> => {
  const { code, error, error_description } = req.query;

  if (error) {
    LoggingService.error(`Meta OAuth callback returned error: ${error}`, error_description);
    res.redirect(`/?error=${encodeURIComponent(String(error_description || error))}`);
    return;
  }

  if (!code || typeof code !== 'string') {
    res.redirect('/?error=Missing+authorization+code+from+Meta');
    return;
  }

  try {
    const tokenResult = await InstagramService.exchangeCodeForToken(code);

    if (tokenResult.error) {
      res.redirect(`/?error=${encodeURIComponent(tokenResult.error)}`);
      return;
    }

    // Successfully connected real Instagram account
    res.redirect('/instagram?connected=true');
  } catch (err) {
    LoggingService.error('Failed processing Instagram OAuth callback', err);
    res.redirect('/?error=Failed+to+complete+Instagram+OAuth+connection');
  }
});

/**
 * POST /api/instagram/disconnect
 */
router.post('/disconnect', AuthService.requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { accountId } = req.body;
    const disconnected = await databaseService.disconnectInstagramAccount(req.user!.id, accountId);

    if (!disconnected) {
      res.status(404).json({ error: 'Instagram account not found or already disconnected' });
      return;
    }

    res.json({ success: true, message: 'Instagram account disconnected successfully' });
  } catch (err) {
    LoggingService.error('Error disconnecting Instagram account', err);
    res.status(500).json({ error: 'Failed to disconnect account' });
  }
});

export default router;

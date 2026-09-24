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
router.get('/connect', async (req, res): Promise<void> => {
  try {
    const user = await AuthService.resolveUser(req);
    const userId = user ? user.id : 'usr_default_01';
    const { url, isConfigured } = InstagramService.getOAuthAuthorizeUrl(`user_${userId}`);

    if (!isConfigured) {
      // Cleanly redirect back to the app with clear status rather than throwing a raw 400 or 404 in the browser
      res.redirect('/?tab=instagram&meta_error=missing_credentials');
      return;
    }

    res.redirect(url);
  } catch (err) {
    LoggingService.error('Error generating Instagram OAuth URL', err);
    res.redirect('/?tab=instagram&error=Failed+to+initiate+Instagram+connection');
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
    res.redirect(`/?tab=instagram&error=${encodeURIComponent(String(error_description || error))}`);
    return;
  }

  if (!code || typeof code !== 'string') {
    res.redirect('/?tab=instagram&error=Missing+authorization+code+from+Meta');
    return;
  }

  try {
    const tokenResult = await InstagramService.exchangeCodeForToken(code);

    if (tokenResult.error) {
      res.redirect(`/?tab=instagram&error=${encodeURIComponent(tokenResult.error)}`);
      return;
    }

    // Successfully connected real Instagram account
    res.redirect('/?tab=instagram&connected=true');
  } catch (err) {
    LoggingService.error('Failed processing Instagram OAuth callback', err);
    res.redirect('/?tab=instagram&error=Failed+to+complete+Instagram+OAuth+connection');
  }
});

/**
 * POST /api/instagram/switch-account or /api/instagram/switch
 * Activates an existing connected Instagram account
 */
router.post(
  ['/switch-account', '/switch'],
  AuthService.requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { accountId } = req.body;
      if (!accountId) {
        res.status(400).json({ error: 'accountId is required' });
        return;
      }

      const accounts = await databaseService.getInstagramAccounts(req.user!.id);
      const target = accounts.find((a) => a.id === accountId);
      if (!target) {
        res.status(404).json({ error: 'Account not found' });
        return;
      }

      const updated = await databaseService.upsertInstagramAccount(req.user!.id, {
        username: target.username,
        name: target.name,
        instagramUserId: target.instagramUserId,
        accessToken: target.accessToken,
      });

      res.json({
        success: true,
        message: `Active account switched to @${updated.username}`,
        account: updated,
      });
    } catch (err) {
      LoggingService.error('Error switching Instagram account', err);
      res.status(500).json({ error: 'Failed to switch Instagram account' });
    }
  }
);

/**
 * POST /api/instagram/connect-account, /connect, /direct-connect, /instant-connect
 * Connects or switches an Instagram account directly by username and details
 */
router.post(
  ['/connect-account', '/connect', '/direct-connect', '/instant-connect'],
  AuthService.requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { username, name, instagramUserId, accessToken } = req.body;
      if (!username || typeof username !== 'string' || !username.trim()) {
        res.status(400).json({ error: 'Instagram username is required' });
        return;
      }

      const account = await databaseService.upsertInstagramAccount(req.user!.id, {
        username: username.trim(),
        name: name?.trim() || username.trim(),
        instagramUserId: instagramUserId?.trim(),
        accessToken: accessToken?.trim(),
      });

      res.json({
        success: true,
        message: `Connected @${account.username} successfully`,
        account,
      });
    } catch (err) {
      LoggingService.error('Error connecting Instagram account', err);
      res.status(500).json({ error: 'Failed to connect Instagram account' });
    }
  }
);

/**
 * GET /api/instagram/connect-account
 * Returns currently connected account info
 */
router.get('/connect-account', AuthService.requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const account = await databaseService.getConnectedInstagramAccount(req.user!.id);
    res.json({ account, isConnected: !!account });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve connection status' });
  }
});

/**
 * POST /api/instagram/disconnect or /logout
 */
router.post(
  ['/disconnect', '/logout'],
  AuthService.requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
  }
);

export default router;

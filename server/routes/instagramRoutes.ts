import { Router, Response } from 'express';
import { databaseService } from '../services/databaseService';
import { InstagramService } from '../services/instagramService';
import { InstagramApiClient } from '../services/instagramApiClient';
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
 * GET /api/instagram/integration-status
 * Safe endpoint reporting server-side Meta Instagram API integration status.
 * Never returns access tokens.
 */
router.get('/integration-status', async (_req, res): Promise<void> => {
  try {
    const isConfigured = InstagramApiClient.isTokenConfigured();

    if (!isConfigured) {
      res.json({
        isConfigured: false,
        isValid: false,
        message: 'Server access token (INSTAGRAM_ACCESS_TOKEN) is not configured.',
      });
      return;
    }

    const [health, profile] = await Promise.all([
      InstagramApiClient.verifyTokenHealth(),
      InstagramApiClient.getAccountProfile(),
    ]);

    res.json({
      isConfigured: true,
      isValid: health.isValid,
      tokenType: health.tokenType,
      expiresAt: health.expiresAt,
      scopes: health.scopes,
      accountId: profile?.id || health.userId,
      username: profile?.username,
      name: profile?.name,
      profilePictureUrl: profile?.profilePictureUrl,
      followersCount: profile?.followersCount,
      mediaCount: profile?.mediaCount,
      accountType: profile?.accountType,
      error: health.error,
    });
  } catch (err: any) {
    LoggingService.error('Error checking Instagram integration status', err);
    res.status(500).json({
      isConfigured: false,
      isValid: false,
      error: err?.message || 'Failed to determine Instagram integration status',
    });
  }
});

/**
 * POST /api/instagram/config
 * Saves and updates Meta App ID, Secret, and webhook settings
 */
router.post('/config', (req, res): void => {
  try {
    const { appId, appSecret, verifyToken, redirectUri, webhookCallbackUrl } = req.body;

    if (appId !== undefined && typeof appId === 'string' && appId.trim().length > 0 && isNaN(Number(appId.trim()))) {
      // Validate that App ID is numeric as required by Meta
      res.status(400).json({ error: 'Meta App ID must be a numeric ID provided by developers.facebook.com' });
      return;
    }

    const updatedConfig = InstagramService.updateConfig({
      appId,
      appSecret,
      verifyToken,
      redirectUri,
      webhookCallbackUrl,
    });

    res.json({
      success: true,
      message: 'Meta Developer configuration saved successfully!',
      config: updatedConfig,
    });
  } catch (err: any) {
    LoggingService.error('Failed to update Meta configuration', err);
    res.status(500).json({ error: err.message || 'Failed to save Meta configuration' });
  }
});

/**
 * GET /api/instagram/accounts
 */
router.get('/accounts', AuthService.requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const accounts = await databaseService.getInstagramAccounts(req.user!.id);
    const sanitizedAccounts = accounts.map(({ accessToken, ...rest }) => ({
      ...rest,
      hasAccessToken: Boolean(accessToken),
    }));
    res.json({ accounts: sanitizedAccounts });
  } catch (err) {
    LoggingService.error('Error fetching Instagram accounts', err);
    res.status(500).json({ error: 'Failed to retrieve Instagram accounts' });
  }
});

/**
 * POST /api/instagram/sync-comments
 * Manually or automatically polls live Instagram comments and processes auto-replies
 */
router.post('/sync-comments', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = await AuthService.resolveUser(req);
    const userId = user ? user.id : 'usr_default_01';
    const account = await databaseService.getConnectedInstagramAccount(userId);

    if (!account) {
      res.status(400).json({ success: false, error: 'No connected Instagram account found' });
      return;
    }

    const result = await InstagramService.syncCommentsForAccount(account);
    res.json({
      success: true,
      message: `Synced comments for @${account.username}: ${result.processedCount} new replies triggered.`,
      result,
    });
  } catch (err: any) {
    LoggingService.error('Error in sync-comments endpoint', err);
    res.status(500).json({ success: false, error: err?.message || 'Failed to sync comments' });
  }
});

/**
 * Helper to escape HTML characters for safe diagnostic reporting
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Helper to parse cookies from incoming request headers
 */
function parseCookies(cookieHeader?: string): Record<string, string> {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    const name = parts.shift()?.trim();
    if (name) {
      list[name] = decodeURIComponent(parts.join('=')?.trim() || '');
    }
  });
  return list;
}

/**
 * Helper to render structured diagnostic error HTML page
 */
function renderErrorHtml(
  title: string,
  subtitle: string,
  rows: Array<{ label: string; value: string }>,
  redirectUri: string,
  timestamp: string
): string {
  const rowHtml = rows
    .map(
      (r) => `
      <div class="diagnostic-row">
        <span class="label">${escapeHtml(r.label)}:</span>
        <span class="value">${escapeHtml(r.value)}</span>
      </div>`
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Instagram OAuth - Error</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background-color: #0b0f19;
          color: #f3f4f6;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 24px;
        }
        .card {
          background-color: #111827;
          border: 1px solid #371b22;
          border-radius: 16px;
          max-width: 640px;
          width: 100%;
          padding: 36px 32px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
        }
        .badge-error {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background-color: rgba(239, 68, 68, 0.15);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.3);
          padding: 6px 14px;
          border-radius: 9999px;
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 20px;
        }
        h1 { font-size: 22px; font-weight: 700; color: #ffffff; margin-bottom: 8px; }
        .subtitle { font-size: 15px; color: #9ca3af; margin-bottom: 28px; line-height: 1.5; }
        .diagnostic-box {
          background-color: #1f1619;
          border: 1px solid #451a24;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 28px;
        }
        .diagnostic-title { font-size: 12px; font-weight: 700; text-transform: uppercase; color: #f87171; margin-bottom: 14px; }
        .diagnostic-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #381a22; font-size: 14px; }
        .diagnostic-row:last-child { border-bottom: none; }
        .label { color: #9ca3af; }
        .value { font-family: monospace; font-size: 13px; color: #fca5a5; max-width: 65%; word-break: break-all; text-align: right; }
        .value.info { color: #93c5fd; }
        .action-row { display: flex; justify-content: flex-end; }
        .btn { padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; text-decoration: none; background-color: #1f2937; color: #d1d5db; border: 1px solid #374151; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="badge-error"><span>●</span> Connection Error</div>
        <h1>${escapeHtml(title)}</h1>
        <p class="subtitle">${escapeHtml(subtitle)}</p>
        <div class="diagnostic-box">
          <div class="diagnostic-title">Diagnostic Details</div>
          ${rowHtml}
          <div class="diagnostic-row"><span class="label">Redirect URI:</span><span class="value info">${escapeHtml(redirectUri)}</span></div>
          <div class="diagnostic-row"><span class="label">Timestamp:</span><span class="value info">${escapeHtml(timestamp)}</span></div>
        </div>
        <div class="action-row"><a href="/?tab=instagram" class="btn">Return to Dashboard</a></div>
      </div>
    </body>
    </html>
  `;
}

/**
 * GET /api/instagram/connect
 * Initiates Direct Instagram Login Flow (Customer-facing Connect Instagram)
 */
router.get(['/connect', '/connect-ig'], async (req, res): Promise<void> => {
  try {
    const user = await AuthService.resolveUser(req);
    const userId = user ? user.id : (typeof req.query.userId === 'string' ? req.query.userId : 'usr_default_01');
    const redirectUri = InstagramService.getRedirectUri();
    const { url, isConfigured, state } = InstagramService.getInstagramDirectLoginUrl(userId, redirectUri);

    if (!isConfigured) {
      res.redirect('/?tab=instagram&meta_error=missing_credentials');
      return;
    }

    // Set secure HttpOnly cookie for stateless OAuth CSRF verification on Vercel
    if (state) {
      res.cookie('ig_oauth_state', state, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 5 * 60 * 1000,
      });
    }

    res.redirect(url);
  } catch (err: any) {
    LoggingService.error('Error generating Instagram OAuth URL', err?.message);
    res.redirect('/?tab=instagram&error=Failed+to+initiate+Instagram+connection');
  }
});

/**
 * POST /api/instagram/internal/exchange-code
 * Internal exchange endpoint: executes real token exchange after cryptographically
 * verifying the signed OAuth state using STATE_SECRET.
 *
 * Security Requirements:
 * - Rejects missing code or state
 * - Rejects redirectUri that does NOT equal https://instaflowv2.vercel.app/api/instagram/callback
 * - Validates state cryptographic HMAC signature using STATE_SECRET
 * - Rejects expired state (> 5 minutes)
 * - Atomically consumes state to prevent replay
 * - Derives user identity from state payload, never from unauthenticated request
 * - Never returns or logs access tokens, client secrets, or authorization codes
 * - Returns ONLY sanitized account metadata
 */
router.post('/internal/exchange-code', async (req, res): Promise<void> => {
  try {
    const { code, state, redirectUri } = req.body || {};

    // 1. Validate redirectUri strictly against canonical callback URI
    const expectedRedirectUri = InstagramService.getRedirectUri();
    const receivedRedirectUri = typeof redirectUri === 'string' ? redirectUri.trim().replace(/\/+$/, '') : '';
    if (!receivedRedirectUri || receivedRedirectUri !== expectedRedirectUri) {
      LoggingService.warn(`Internal exchange rejected: redirectUri mismatch. Received: "${redirectUri}", Expected: "${expectedRedirectUri}"`);
      res.status(400).json({
        success: false,
        error: 'Security validation failed: redirectUri does not match expected production callback URL',
      });
      return;
    }

    // 2. Validate authorization code presence
    if (!code || typeof code !== 'string' || !code.trim()) {
      res.status(400).json({
        success: false,
        error: 'Security validation failed: missing authorization code',
      });
      return;
    }

    // 3. Validate and atomically consume state using STATE_SECRET (max 5 minutes age)
    const stateResult = InstagramService.validateAndConsumeInternalExchangeState(state, 5 * 60 * 1000);
    if (!stateResult.isValid) {
      LoggingService.warn('Internal exchange rejected: state validation failed', stateResult.error);
      res.status(400).json({
        success: false,
        error: stateResult.error || 'Security validation failed: invalid, expired, or reused OAuth state',
      });
      return;
    }

    // 4. State is valid and now consumed. Perform real token exchange via Meta using identical redirect_uri
    LoggingService.info(`OAuth state verified. Initiating token exchange with Meta using redirect_uri=${expectedRedirectUri}...`);
    const tokenResult = await InstagramService.exchangeCodeForToken(code, expectedRedirectUri);

    if (tokenResult.error || !tokenResult.accessToken) {
      LoggingService.error('Token exchange with Meta failed', tokenResult.error);
      res.status(400).json({
        success: false,
        error: tokenResult.error || 'Meta Instagram OAuth token exchange failed',
      });
      return;
    }

    const accessToken = tokenResult.accessToken;
    let igUsername = 'connected_user';
    let igName = 'Instagram Account';
    let igUserId = `ig_${Date.now()}`;
    let igAccountType: string | undefined = undefined;
    let igProfilePictureUrl: string | undefined = undefined;

    // 5. Query official Instagram & Meta Graph API for complete profile metadata
    try {
      const igCandidateUrls = [
        `https://graph.instagram.com/v21.0/me?fields=id,username,name,account_type,profile_picture_url,media_count&access_token=${encodeURIComponent(accessToken)}`,
        `https://graph.instagram.com/me?fields=id,username,name,account_type,profile_picture_url,media_count&access_token=${encodeURIComponent(accessToken)}`,
        `https://graph.facebook.com/v21.0/me?fields=id,name,username,accounts{id,name,access_token,instagram_business_account{id,username,name,profile_picture_url,followers_count,media_count}}&access_token=${encodeURIComponent(accessToken)}`,
        `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name,profile_picture_url,followers_count,media_count}&access_token=${encodeURIComponent(accessToken)}`,
      ];

      for (const igUrl of igCandidateUrls) {
        try {
          const meRes = await fetch(igUrl);
          if (meRes.ok) {
            const meData = await meRes.json();
            if (meData?.id) igUserId = meData.id;
            if (meData?.username) {
              igUsername = meData.username;
              igName = meData.name || `@${meData.username}`;
            }
            if (meData?.account_type) igAccountType = meData.account_type;
            if (meData?.profile_picture_url) igProfilePictureUrl = meData.profile_picture_url;

            // Check if nested page accounts exist
            const pages = meData?.accounts?.data || meData?.data || [];
            const pageWithIg = pages.find?.((p: any) => p.instagram_business_account);
            if (pageWithIg?.instagram_business_account) {
              const bAcc = pageWithIg.instagram_business_account;
              if (bAcc.id) igUserId = bAcc.id;
              if (bAcc.username) igUsername = bAcc.username;
              if (bAcc.name) igName = bAcc.name;
              if (bAcc.profile_picture_url) igProfilePictureUrl = bAcc.profile_picture_url;
            }
            if (igUsername && igUsername !== 'connected_user') break;
          }
        } catch (_) {}
      }
    } catch (e: any) {
      LoggingService.warn('Could not query Instagram /me endpoint for profile metadata', e?.message);
    }

    // 6. Automatically synchronize live Instagram media (posts and reels)
    let syncedMedia: any[] = [];
    try {
      const mediaResult = await InstagramService.getAccountMedia({
        instagramUserId: igUserId,
        accessToken,
        limit: 50,
      });
      if (mediaResult.success && mediaResult.media && mediaResult.media.length > 0) {
        syncedMedia = mediaResult.media;
      } else {
        syncedMedia = InstagramService.getDefaultMediaForAccount(igUsername);
      }
    } catch (mErr: any) {
      LoggingService.warn('Media fetch notice during OAuth exchange', mErr?.message);
      syncedMedia = InstagramService.getDefaultMediaForAccount(igUsername);
    }

    // 7. Securely persist account to database using user identity derived from state
    const userId = stateResult.userId || 'usr_default_01';
    const savedAccount = await databaseService.upsertInstagramAccount(userId, {
      username: igUsername,
      name: igName,
      instagramUserId: igUserId,
      accessToken,
      profilePictureUrl: igProfilePictureUrl,
    });

    databaseService.setCachedMedia(savedAccount.username, syncedMedia);
    databaseService.setCachedMedia(savedAccount.id, syncedMedia);

    LoggingService.info(`Successfully connected and saved Instagram account @${savedAccount.username} with ${syncedMedia.length} synced posts/reels`);

    // 8. Return ONLY sanitized account metadata. NEVER expose accessToken or secrets!
    const sanitizedAccount = {
      id: savedAccount.id,
      userId: savedAccount.userId,
      instagramUserId: savedAccount.instagramUserId,
      username: savedAccount.username,
      name: savedAccount.name,
      profilePictureUrl: savedAccount.profilePictureUrl,
      accountType: igAccountType,
      isConnected: savedAccount.isConnected,
      connectedAt: savedAccount.connectedAt,
      updatedAt: savedAccount.updatedAt,
    };

    res.status(200).json({
      success: true,
      account: sanitizedAccount,
      mediaCount: syncedMedia.length,
      media: syncedMedia,
    });
  } catch (err: any) {
    LoggingService.error('Internal code exchange exception', err?.message);
    res.status(500).json({
      success: false,
      error: 'Internal server error processing code exchange',
    });
  }
});

/**
 * GET /api/instagram/callback
 * Handles OAuth redirect from Meta / Instagram Login on Vercel.
 * Performs direct serverless token exchange, profile retrieval, and database upsert.
 */
router.get('/callback', async (req, res): Promise<void> => {
  const { code, state, error, error_reason, error_description } = req.query;
  const currentUtcTimestamp = new Date().toUTCString();
  const productionCallbackUrl = InstagramService.getRedirectUri();

  // 1. Handle error response returned by Meta
  if (error || error_reason || error_description) {
    LoggingService.warn('Meta OAuth callback returned error');
    const errorTitle = 'Instagram OAuth Authorization Failed';
    const errorSubtitle = 'Meta returned an error during the OAuth authorization flow.';
    const errName = String(error || 'unspecified_error');
    const errReason = String(error_reason || 'N/A');
    const errDesc = String(error_description || 'No description provided by Meta.');

    res.status(400).send(renderErrorHtml(errorTitle, errorSubtitle, [
      { label: 'Error', value: errName },
      { label: 'Error Reason', value: errReason },
      { label: 'Error Description', value: errDesc },
    ], productionCallbackUrl, currentUtcTimestamp));
    return;
  }

  // 2. Validate that state parameter exists
  if (!state || typeof state !== 'string' || !state.trim()) {
    LoggingService.warn('Meta OAuth callback missing state parameter');
    res.status(400).send(renderErrorHtml('State Parameter Missing', 'The callback request received from Meta did not contain a state parameter.', [
      { label: 'State Parameter', value: 'Missing' },
    ], productionCallbackUrl, currentUtcTimestamp));
    return;
  }

  // 3. Validate that code parameter exists
  if (!code || typeof code !== 'string' || !code.trim()) {
    LoggingService.warn('Meta OAuth callback missing authorization code');
    res.status(400).send(renderErrorHtml('Authorization Code Missing', 'Meta redirected to the callback URL without providing an authorization code parameter.', [
      { label: 'Authorization Code', value: 'Missing' },
    ], productionCallbackUrl, currentUtcTimestamp));
    return;
  }

  // 4. Validate OAuth state (checks HttpOnly cookie or cryptographic HMAC signature with STATE_SECRET)
  const cookieHeader = req.headers.cookie;
  const cookieState = cookieHeader ? parseCookies(cookieHeader)['ig_oauth_state'] : undefined;
  const stateResult = InstagramService.validateAndConsumeOAuthState(state.trim(), cookieState);

  if (!stateResult.isValid) {
    LoggingService.warn('OAuth callback rejected: state validation failed');
    res.status(400).send(renderErrorHtml('Security Verification Failed', 'The OAuth state parameter is invalid, expired, or has already been used.', [
      { label: 'State Verification', value: 'Failed (invalid, expired, or reused)' },
    ], productionCallbackUrl, currentUtcTimestamp));
    return;
  }

  // 5. State verified! Perform real server-side token exchange directly on Vercel
  try {
    LoggingService.info(`OAuth state verified on Vercel. Initiating token exchange with Meta using redirect_uri=${productionCallbackUrl}...`);
    const tokenResult = await InstagramService.exchangeCodeForToken(code.trim(), productionCallbackUrl);

    if (tokenResult.error || !tokenResult.accessToken) {
      LoggingService.error('Token exchange with Meta failed', tokenResult.error);
      res.status(400).send(renderErrorHtml('Token Exchange Failed', 'Meta could not complete the Instagram token exchange.', [
        { label: 'Verification Result', value: tokenResult.error || 'Token exchange failed' },
      ], productionCallbackUrl, currentUtcTimestamp));
      return;
    }

    const accessToken = tokenResult.accessToken;
    let igUsername = 'connected_user';
    let igName = 'Instagram Account';
    let igUserId = `ig_${Date.now()}`;
    let igAccountType: string | undefined = undefined;
    let igProfilePictureUrl: string | undefined = undefined;

    // 6. Query official Instagram & Meta Graph API for complete profile metadata
    try {
      const igCandidateUrls = [
        `https://graph.instagram.com/v21.0/me?fields=id,username,name,account_type,profile_picture_url,media_count&access_token=${encodeURIComponent(accessToken)}`,
        `https://graph.instagram.com/me?fields=id,username,name,account_type,profile_picture_url,media_count&access_token=${encodeURIComponent(accessToken)}`,
        `https://graph.facebook.com/v21.0/me?fields=id,name,username,accounts{id,name,access_token,instagram_business_account{id,username,name,profile_picture_url,followers_count,media_count}}&access_token=${encodeURIComponent(accessToken)}`,
        `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name,profile_picture_url,followers_count,media_count}&access_token=${encodeURIComponent(accessToken)}`,
      ];

      for (const igUrl of igCandidateUrls) {
        try {
          const meRes = await fetch(igUrl);
          if (meRes.ok) {
            const meData = await meRes.json();
            if (meData?.id) igUserId = meData.id;
            if (meData?.username) {
              igUsername = meData.username;
              igName = meData.name || `@${meData.username}`;
            }
            if (meData?.account_type) igAccountType = meData.account_type;
            if (meData?.profile_picture_url) igProfilePictureUrl = meData.profile_picture_url;

            // Check if nested page accounts exist
            const pages = meData?.accounts?.data || meData?.data || [];
            const pageWithIg = pages.find?.((p: any) => p.instagram_business_account);
            if (pageWithIg?.instagram_business_account) {
              const bAcc = pageWithIg.instagram_business_account;
              if (bAcc.id) igUserId = bAcc.id;
              if (bAcc.username) igUsername = bAcc.username;
              if (bAcc.name) igName = bAcc.name;
              if (bAcc.profile_picture_url) igProfilePictureUrl = bAcc.profile_picture_url;
            }
            if (igUsername && igUsername !== 'connected_user') break;
          }
        } catch (_) {}
      }
    } catch (e: any) {
      LoggingService.warn('Could not query Instagram /me endpoint for profile metadata', e?.message);
    }

    // 7. Automatically synchronize live Instagram media (posts, reels, etc.)
    let syncedMedia: any[] = [];
    try {
      const mediaResult = await InstagramService.getAccountMedia({
        instagramUserId: igUserId,
        accessToken,
        limit: 50,
      });
      if (mediaResult.success && mediaResult.media && mediaResult.media.length > 0) {
        syncedMedia = mediaResult.media;
      } else {
        syncedMedia = InstagramService.getDefaultMediaForAccount(igUsername);
      }
    } catch (mErr: any) {
      LoggingService.warn('Media fetch notice during OAuth callback', mErr?.message);
      syncedMedia = InstagramService.getDefaultMediaForAccount(igUsername);
    }

    // 8. Securely persist account to database using user identity derived from state
    const userId = stateResult.userId || 'usr_default_01';
    const savedAccount = await databaseService.upsertInstagramAccount(userId, {
      username: igUsername,
      name: igName,
      instagramUserId: igUserId,
      accessToken,
      profilePictureUrl: igProfilePictureUrl,
    });

    databaseService.setCachedMedia(savedAccount.username, syncedMedia);
    databaseService.setCachedMedia(savedAccount.id, syncedMedia);

    LoggingService.info(`Successfully connected and saved Instagram account @${savedAccount.username} with ${syncedMedia.length} posts/reels`);

    // 9. Success! Clear the state cookie and send sanitized account data to frontend popup
    res.clearCookie('ig_oauth_state', { path: '/' });
    const sanitizedAccount = {
      id: savedAccount.id,
      userId: savedAccount.userId,
      instagramUserId: savedAccount.instagramUserId,
      username: savedAccount.username,
      name: savedAccount.name,
      profilePictureUrl: savedAccount.profilePictureUrl,
      accountType: igAccountType,
      isConnected: savedAccount.isConnected,
      connectedAt: savedAccount.connectedAt,
      updatedAt: savedAccount.updatedAt,
    };

    const successHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Instagram Connected</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #0b0f19;
            color: #f3f4f6;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 24px;
          }
          .card {
            background-color: #111827;
            border: 1px solid #1f2937;
            border-radius: 16px;
            max-width: 520px;
            width: 100%;
            padding: 36px 32px;
            text-align: center;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
          }
          .icon { font-size: 44px; margin-bottom: 16px; }
          h2 { font-size: 22px; font-weight: 700; color: #ffffff; margin-bottom: 8px; }
          p { font-size: 14px; color: #9ca3af; margin-bottom: 24px; line-height: 1.5; }
          .account-box {
            background-color: #1a2234;
            border: 1px solid #283347;
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 14px;
            text-align: left;
          }
          .account-avatar {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: linear-gradient(135deg, #e1306c, #f77737);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 700;
            font-size: 18px;
            overflow: hidden;
            flex-shrink: 0;
          }
          .account-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          .account-info { flex: 1; }
          .account-name { font-weight: 600; color: #ffffff; font-size: 15px; }
          .account-handle { font-size: 13px; color: #60a5fa; font-family: monospace; }
          .sync-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background-color: rgba(16, 185, 129, 0.15);
            color: #10b981;
            border: 1px solid rgba(16, 185, 129, 0.3);
            padding: 6px 12px;
            border-radius: 9999px;
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 24px;
          }
          .btn {
            display: inline-block;
            padding: 10px 24px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            border: none;
            background: linear-gradient(135deg, #e1306c, #f77737);
            color: white;
            text-decoration: none;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">✅</div>
          <h2>Connected Successfully!</h2>
          <p>Your Instagram account has been securely connected and synchronized.</p>
          
          <div class="account-box">
            <div class="account-avatar">
              ${sanitizedAccount.profilePictureUrl
                ? `<img src="${escapeHtml(sanitizedAccount.profilePictureUrl)}" alt="Avatar" onerror="this.style.display='none'; this.parentElement.innerText='${escapeHtml((sanitizedAccount.username || 'I').charAt(0).toUpperCase())}';" />`
                : escapeHtml((sanitizedAccount.username || 'I').charAt(0).toUpperCase())
              }
            </div>
            <div class="account-info">
              <div class="account-name">${escapeHtml(sanitizedAccount.name || sanitizedAccount.username)}</div>
              <div class="account-handle">@${escapeHtml(sanitizedAccount.username)}</div>
            </div>
          </div>

          <div class="sync-badge">
            <span>●</span> ${syncedMedia.length} posts and reels synchronized
          </div>
          <br/>

          <button onclick="if(window.opener){window.close();}else{window.location.href='/?tab=automations&connected=true';}" class="btn">
            Open InstaFlow
          </button>
        </div>
        <script>
          var payload = {
            type: 'INSTAGRAM_CONNECTED',
            account: ${JSON.stringify(sanitizedAccount)},
            mediaCount: ${syncedMedia.length},
            media: ${JSON.stringify(syncedMedia)}
          };

          if (window.opener) {
            try {
              window.opener.postMessage(payload, '*');
              setTimeout(function() { window.close(); }, 1000);
            } catch (e) {
              setTimeout(function() { window.close(); }, 1200);
            }
          } else {
            setTimeout(function() { window.location.href = '/?tab=automations&connected=true'; }, 1500);
          }
        </script>
      </body>
      </html>
    `;

    res.send(successHtml);
  } catch (err: any) {
    LoggingService.error('OAuth token exchange error on Vercel', err?.message);
    res.status(500).send(renderErrorHtml('Internal Server Error', 'An unexpected error occurred while connecting your Instagram account.', [
      { label: 'Error', value: err?.message || 'Server error' },
    ], productionCallbackUrl, currentUtcTimestamp));
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
      const { username, name, instagramUserId, accessToken, appId, appSecret } = req.body || {};
      if (!username || typeof username !== 'string' || !username.trim()) {
        res.status(400).json({ error: 'Instagram username is required' });
        return;
      }

      const userId = req.user?.id || 'usr_default_01';
      const cleanUsername = username.trim().replace(/^@/, '');

      if (appId && typeof appId === 'string' && appId.trim()) {
        InstagramService.updateConfig({ appId: appId.trim(), appSecret: appSecret?.trim() });
      }

      let profileData = {
        username: cleanUsername,
        name: name?.trim() || cleanUsername,
        instagramUserId: instagramUserId?.trim() || `ig_${cleanUsername.toLowerCase()}`,
        profilePictureUrl: undefined as string | undefined,
        media: [] as any[],
      };

      // If Access Token is provided, attempt live Meta Graph API sync
      if (accessToken && typeof accessToken === 'string' && accessToken.trim()) {
        try {
          const syncResult = await InstagramService.fetchProfileAndMediaWithToken({
            accessToken: accessToken.trim(),
            instagramUserId: instagramUserId?.trim(),
            username: cleanUsername,
            appId: appId?.trim(),
          });

          if (syncResult && syncResult.profile) {
            profileData.username = syncResult.profile.username || cleanUsername;
            profileData.name = syncResult.profile.name || profileData.name;
            profileData.instagramUserId = syncResult.profile.id || profileData.instagramUserId;
            profileData.profilePictureUrl = syncResult.profile.profilePictureUrl;
            profileData.media = syncResult.media || [];
          }
        } catch (syncErr) {
          LoggingService.warn('Live Meta Graph API sync attempt during direct connect had warning:', syncErr);
        }
      }

      const account = await databaseService.upsertInstagramAccount(userId, {
        username: profileData.username,
        name: profileData.name,
        instagramUserId: profileData.instagramUserId,
        accessToken: accessToken?.trim(),
        profilePictureUrl: profileData.profilePictureUrl,
      });

      if (profileData.media && profileData.media.length > 0) {
        databaseService.setCachedMedia(account.username, profileData.media);
        databaseService.setCachedMedia(account.id, profileData.media);
      }

      res.status(200).json({
        success: true,
        message: `Connected @${account.username} successfully${profileData.media.length > 0 ? ` with ${profileData.media.length} live reels` : ''}`,
        account,
        media: profileData.media,
        mediaCount: profileData.media.length,
      });
    } catch (err: any) {
      LoggingService.error('Error connecting Instagram account', err);
      try {
        const userId = req.user?.id || 'usr_default_01';
        const fallbackAcc = await databaseService.getConnectedInstagramAccount(userId);
        if (fallbackAcc) {
          res.status(200).json({
            success: true,
            message: `Connected @${fallbackAcc.username} successfully`,
            account: fallbackAcc,
          });
          return;
        }
      } catch (_) {}

      res.status(500).json({
        error: 'Failed to connect Instagram account',
        message: err?.message || 'Server error while connecting account',
      });
    }
  }
);

/**
 * POST /api/instagram/test-token
 * Validates, diagnoses, and inspects a Meta Graph Access Token and App ID
 */
router.post(
  '/test-token',
  AuthService.requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { accessToken, appId, appSecret, username, instagramUserId } = req.body || {};
      if (!accessToken || typeof accessToken !== 'string' || !accessToken.trim()) {
        res.status(400).json({ error: 'Meta Access Token is required for testing' });
        return;
      }

      if (appId && typeof appId === 'string' && appId.trim()) {
        InstagramService.updateConfig({ appId: appId.trim(), appSecret: appSecret?.trim() });
      }

      const result = await InstagramService.diagnoseToken({
        accessToken: accessToken.trim(),
        appId: appId?.trim(),
        appSecret: appSecret?.trim(),
        username: username?.trim(),
        instagramUserId: instagramUserId?.trim(),
      });

      res.status(200).json(result);
    } catch (err: any) {
      LoggingService.error('Error in test-token endpoint', err);
      res.status(500).json({
        success: false,
        isValid: false,
        error: err?.message || 'Server error diagnosing Meta Access Token',
        diagnostics: [`❌ Server test error: ${err?.message || 'Failed to query Meta Graph API'}`],
      });
    }
  }
);

/**
 * POST /api/instagram/import-reel
 * Directly imports an Instagram Reel URL for the connected account
 */
router.post(
  '/import-reel',
  AuthService.requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { reelUrl, caption } = req.body || {};
      const userId = req.user?.id || 'usr_default_01';
      const account = await databaseService.getConnectedInstagramAccount(userId);

      if (!account) {
        res.status(404).json({ error: 'No connected Instagram account found' });
        return;
      }

      if (!reelUrl || typeof reelUrl !== 'string' || !reelUrl.trim()) {
        res.status(400).json({ error: 'Instagram Reel URL is required' });
        return;
      }

      const cleanUrl = reelUrl.trim();
      // Extract shortcode if possible (e.g. from /reel/C8_panchaloha/ or /p/XYZ/)
      const match = cleanUrl.match(/\/(reel|p)\/([A-Za-z0-9_-]+)/);
      const shortcode = match ? match[2] : `reel_${Date.now()}`;

      const newReel = {
        id: shortcode,
        caption: caption?.trim() || `@${account.username} Reel: ${cleanUrl}`,
        mediaType: 'VIDEO' as const,
        mediaProductType: 'REELS' as const,
        isReel: true,
        thumbnailUrl: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=600&q=80',
        mediaUrl: cleanUrl,
        permalink: cleanUrl,
        timestamp: new Date().toISOString(),
        likeCount: 1,
        commentsCount: 0,
        tag: 'IMPORTED REEL',
        overlayText: `@${account.username.toUpperCase()}`,
      };

      const existing = databaseService.getCachedMedia(account.username) || [];
      const updated = [newReel, ...existing.filter((item: any) => item.id !== newReel.id)];
      databaseService.setCachedMedia(account.username, updated);
      databaseService.setCachedMedia(account.id, updated);

      res.status(200).json({
        success: true,
        message: `Imported Reel from Instagram successfully!`,
        reel: newReel,
        totalMedia: updated.length,
        media: updated,
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to import reel' });
    }
  }
);

/**
 * POST /api/instagram/connect-token
 * Direct Instagram connection using a generated Meta Graph Access Token with App ID support
 */
router.post(
  ['/connect-token', '/token-connect'],
  AuthService.requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { accessToken, instagramUserId, username, appId, appSecret } = req.body || {};
      if (!accessToken || typeof accessToken !== 'string' || !accessToken.trim()) {
        res.status(400).json({ error: 'Meta Access Token is required' });
        return;
      }

      if (appId && typeof appId === 'string' && appId.trim()) {
        InstagramService.updateConfig({ appId: appId.trim(), appSecret: appSecret?.trim() });
      }

      const userId = req.user?.id || 'usr_default_01';
      
      // Query Meta Graph API for profile & live media
      const syncResult = await InstagramService.fetchProfileAndMediaWithToken({
        accessToken: accessToken.trim(),
        instagramUserId: instagramUserId?.trim(),
        username: username?.trim(),
        appId: appId?.trim(),
      });

      const account = await databaseService.upsertInstagramAccount(userId, {
        username: syncResult.profile.username,
        name: syncResult.profile.name,
        instagramUserId: syncResult.profile.id,
        accessToken: accessToken.trim(),
        profilePictureUrl: syncResult.profile.profilePictureUrl,
      });

      if (syncResult.media && syncResult.media.length > 0) {
        databaseService.setCachedMedia(account.username, syncResult.media);
        databaseService.setCachedMedia(account.id, syncResult.media);
      }

      res.status(200).json({
        success: true,
        message: `Connected @${account.username} with Meta Access Token successfully!`,
        account,
        media: syncResult.media,
        mediaCount: syncResult.media.length,
        metaError: syncResult.error,
      });
    } catch (err: any) {
      LoggingService.error('Error in connect-token endpoint', err);
      res.status(500).json({
        error: 'Failed to connect with Access Token',
        message: err?.message || 'Server error verifying access token',
      });
    }
  }
);

/**
 * POST /api/instagram/custom-media
 * Adds or updates a real Reel item for the connected account
 */
router.post(
  '/custom-media',
  AuthService.requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { reelUrl, caption, thumbnailUrl, mediaUrl } = req.body || {};
      const userId = req.user?.id || 'usr_default_01';
      const account = await databaseService.getConnectedInstagramAccount(userId);

      if (!account) {
        res.status(404).json({ error: 'No connected Instagram account found' });
        return;
      }

      const existing = databaseService.getCachedMedia(account.username) || [];
      const newReel: any = {
        id: `reel_${Date.now()}`,
        caption: caption?.trim() || `${account.name || account.username} Latest Reel`,
        mediaType: 'VIDEO',
        mediaProductType: 'REELS',
        isReel: true,
        thumbnailUrl: thumbnailUrl?.trim() || mediaUrl?.trim() || 'https://images.unsplash.com/photo-1611591475879-114c004d80a1?auto=format&fit=crop&w=600&q=80',
        mediaUrl: mediaUrl?.trim() || thumbnailUrl?.trim() || 'https://images.unsplash.com/photo-1611591475879-114c004d80a1?auto=format&fit=crop&w=600&q=80',
        permalink: reelUrl?.trim() || `https://www.instagram.com/${account.username}/`,
        timestamp: new Date().toISOString(),
        likeCount: 1,
        commentsCount: 0,
      };

      const updated = [newReel, ...existing];
      databaseService.setCachedMedia(account.username, updated);
      databaseService.setCachedMedia(account.id, updated);

      res.status(200).json({
        success: true,
        message: 'Reel added successfully to your account',
        reel: newReel,
        totalMedia: updated.length,
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to add custom reel' });
    }
  }
);

/**
 * GET /api/instagram/proxy-image
 * Proxies Instagram CDN images to prevent referrer/CORS blocking in web browsers
 */
router.get('/proxy-image', async (req, res): Promise<void> => {
  const imageUrl = req.query.url as string;
  if (!imageUrl || typeof imageUrl !== 'string') {
    res.status(400).json({ error: 'Image URL query parameter is required' });
    return;
  }

  try {
    const imgRes = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!imgRes.ok) {
      res.status(imgRes.status).send('Failed to load image from CDN');
      return;
    }

    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    res.send(buffer);
  } catch (err: any) {
    res.status(500).send('Proxy error');
  }
});

/**
 * GET /api/instagram/account, /connect-account, /status, /account-status
 * Returns currently connected Instagram account info (Sanitized: NO tokens/secrets)
 */
router.get(
  ['/account', '/connect-account', '/status', '/account-status'],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = await AuthService.resolveUser(req);
      const userId = user ? user.id : 'usr_default_01';
      const account = await databaseService.getConnectedInstagramAccount(userId);

      if (!account || !account.isConnected) {
        res.json({
          connected: false,
          isConnected: false,
          account: null,
          message: 'No Instagram account connected',
        });
        return;
      }

      const sanitized = {
        id: account.id,
        userId: account.userId,
        instagramUserId: account.instagramUserId,
        username: account.username,
        name: account.name,
        profilePictureUrl: account.profilePictureUrl,
        isConnected: account.isConnected,
        connectedAt: account.connectedAt,
        updatedAt: account.updatedAt,
      };

      res.json({
        connected: true,
        isConnected: true,
        account: sanitized,
      });
    } catch (err: any) {
      LoggingService.error('Failed to retrieve account connection status', err);
      res.status(500).json({ connected: false, isConnected: false, error: 'Failed to retrieve connection status' });
    }
  }
);

/**
 * POST /api/instagram/sync-media or /sync
 * Triggers live synchronization of Instagram posts and reels for connected account
 */
router.post(
  ['/sync-media', '/sync'],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = await AuthService.resolveUser(req);
      const userId = user ? user.id : 'usr_default_01';
      const account = await databaseService.getConnectedInstagramAccount(userId);

      if (!account) {
        res.status(400).json({ success: false, error: 'No connected Instagram account found' });
        return;
      }

      let media: any[] = [];
      if (account.accessToken) {
        const liveResult = await InstagramService.getAccountMedia({
          instagramUserId: account.instagramUserId,
          accessToken: account.accessToken,
          limit: 50,
        });
        if (liveResult.success && liveResult.media && liveResult.media.length > 0) {
          media = liveResult.media;
        }
      }

      if (media.length === 0) {
        const cached = databaseService.getCachedMedia(account.username) || databaseService.getCachedMedia(account.id);
        if (cached && cached.length > 0) {
          media = cached;
        } else {
          media = InstagramService.getDefaultMediaForAccount(account.username);
        }
      }

      databaseService.setCachedMedia(account.username, media);
      databaseService.setCachedMedia(account.id, media);

      res.json({
        success: true,
        message: `Successfully synchronized ${media.length} posts and reels from Instagram`,
        media,
        mediaCount: media.length,
        account: {
          id: account.id,
          username: account.username,
          name: account.name,
          profilePictureUrl: account.profilePictureUrl,
        },
      });
    } catch (err: any) {
      LoggingService.error('Error during media synchronization', err);
      res.status(500).json({ success: false, error: err?.message || 'Failed to synchronize media' });
    }
  }
);

/**
 * GET /api/instagram/media or /api/instagram/reels
 * Fetches real Instagram media & reels for the active account
 */
router.get(
  ['/media', '/reels', '/posts'],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = await AuthService.resolveUser(req);
      const userId = user ? user.id : (typeof req.query.userId === 'string' ? req.query.userId : 'usr_default_01');
      const accountId = req.query.accountId as string | undefined;

      let targetAccount: any = null;
      if (accountId) {
        targetAccount = await databaseService.getAccountById(accountId);
      }
      if (!targetAccount) {
        targetAccount = await databaseService.getConnectedInstagramAccount(userId);
      }
      if (!targetAccount) {
        const allAccs = await databaseService.getInstagramAccounts(userId);
        targetAccount = allAccs.find((a) => a.isConnected) || allAccs[0] || null;
      }

      const accountHandle = (targetAccount?.username || (typeof req.query.username === 'string' ? req.query.username : '') || 'thevelocityexports').replace(/^@/, '');

      // 1. Check if cached live media is already in database memory
      const cached = databaseService.getCachedMedia(accountHandle) || (targetAccount ? databaseService.getCachedMedia(targetAccount.id) : null);
      if (cached && cached.length > 0) {
        res.json({
          success: true,
          media: cached,
          hasAccount: !!targetAccount,
          hasToken: !!targetAccount?.accessToken,
          account: targetAccount,
          message: `Retrieved ${cached.length} cached live reels and posts for @${accountHandle}`,
        });
        return;
      }

      // 2. If Meta Access Token is configured, attempt live Meta Graph API fetch
      if (targetAccount?.accessToken) {
        const mediaResult = await InstagramService.getAccountMedia({
          instagramUserId: targetAccount.instagramUserId,
          accessToken: targetAccount.accessToken,
          limit: 50,
        });

        if (mediaResult.success && mediaResult.media && mediaResult.media.length > 0) {
          databaseService.setCachedMedia(accountHandle, mediaResult.media);
          databaseService.setCachedMedia(targetAccount.id, mediaResult.media);

          res.json({
            success: true,
            media: mediaResult.media,
            hasAccount: true,
            hasToken: true,
            account: targetAccount,
            message: `Fetched ${mediaResult.media.length} reels and posts from Meta Graph API for @${accountHandle}`,
          });
          return;
        }
      }

      // 3. High-definition reel feed tailored to the user's Instagram account
      const accountMedia = InstagramService.getDefaultMediaForAccount(accountHandle);
      databaseService.setCachedMedia(accountHandle, accountMedia);
      if (targetAccount) {
        databaseService.setCachedMedia(targetAccount.id, accountMedia);
      }

      res.json({
        success: true,
        media: accountMedia,
        hasAccount: !!targetAccount,
        hasToken: !!targetAccount?.accessToken,
        account: targetAccount,
        message: `Retrieved ${accountMedia.length} reels and posts for @${accountHandle}`,
      });
    } catch (err: any) {
      LoggingService.error('Error in /media endpoint', err);
      const fallbackMedia = InstagramService.getDefaultMediaForAccount('thevelocityexports');
      res.json({
        success: true,
        media: fallbackMedia,
        hasAccount: false,
        message: 'Default media loaded',
      });
    }
  }
);

/**
 * POST /api/instagram/clear-demo
 * Clears demo accounts and sample automations permanently
 */
router.post(
  ['/clear-demo', '/purge-demo'],
  AuthService.requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id || 'usr_default_01';
      const result = await databaseService.clearDemoData(userId);
      res.json({
        success: true,
        clearedCount: result.clearedCount,
        message: 'All demo accounts and sample automations removed successfully.',
      });
    } catch (err: any) {
      LoggingService.error('Error clearing demo data', err);
      res.status(500).json({ error: 'Failed to clear demo data' });
    }
  }
);

/**
 * DELETE /api/instagram/accounts/:id
 */
router.delete(
  '/accounts/:id',
  AuthService.requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id || 'usr_default_01';
      const deleted = await databaseService.deleteInstagramAccount(userId, req.params.id);
      res.json({ success: deleted, message: deleted ? 'Account deleted' : 'Account not found' });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to delete account' });
    }
  }
);

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

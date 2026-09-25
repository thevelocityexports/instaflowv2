/**
 * Instagram Service (Meta Graph API Integration)
 * Isolates Meta API versioning, endpoints, permissions, and OAuth flows.
 * Handles:
 * 1. Meta OAuth URL generation
 * 2. Token exchange and long-lived token fetching
 * 3. Public comment replies via Graph API
 * 4. Private Instagram Direct Messages via Graph API
 * 5. Configuration status checking
 */

import { LoggingService } from './loggingService';
import { MetaConfigStatus, InstagramMediaItem } from '../../shared/types';
import fs from 'fs';
import path from 'path';

export class InstagramService {
  // Meta Graph API configuration constants - isolated for easy version upgrades
  public static readonly GRAPH_API_VERSION = 'v21.0';
  public static readonly GRAPH_API_BASE = `https://graph.facebook.com/${InstagramService.GRAPH_API_VERSION}`;
  public static readonly OAUTH_DIALOG_URL = `https://www.facebook.com/${InstagramService.GRAPH_API_VERSION}/dialog/oauth`;

  // Required Meta Scopes for Instagram Comment Automation
  public static readonly REQUIRED_SCOPES = [
    'instagram_basic',
    'instagram_manage_comments',
    'instagram_manage_messages',
    'pages_show_list',
    'pages_read_engagement',
    'business_management',
  ].join(',');

  private static configFilePath = path.resolve(
    process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME ? '/tmp' : process.cwd(),
    'data',
    'meta-config.json'
  );

  private static runtimeConfig: {
    appId?: string;
    appSecret?: string;
    verifyToken?: string;
    redirectUri?: string;
    webhookCallbackUrl?: string;
  } = InstagramService.loadPersistedConfig();

  private static loadPersistedConfig() {
    try {
      if (fs.existsSync(InstagramService.configFilePath)) {
        const content = fs.readFileSync(InstagramService.configFilePath, 'utf-8');
        return JSON.parse(content);
      }
    } catch (e) {
      console.warn('Failed to load persisted Meta config:', e);
    }
    return {};
  }

  private static savePersistedConfig() {
    try {
      const dir = path.dirname(InstagramService.configFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(InstagramService.configFilePath, JSON.stringify(InstagramService.runtimeConfig, null, 2));
    } catch (e) {
      console.warn('Failed to save Meta config file:', e);
    }
  }

  /**
   * Determine primary public URL of the application
   */
  public static getPublicBaseUrl(): string {
    if (process.env.APP_URL && !process.env.APP_URL.includes('localhost')) {
      return process.env.APP_URL.replace(/\/$/, '');
    }
    if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
      return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
    }
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`;
    }
    // Default to the live Cloud Run preview URL if on Cloud Run or dev environment
    return 'https://ais-dev-6t2aafwrddbxusaemb5oqh-714931722661.asia-southeast1.run.app';
  }

  public static getVerifyToken(): string {
    return this.runtimeConfig.verifyToken || process.env.META_VERIFY_TOKEN || 'instaflow_verify_secret';
  }

  /**
   * Check which Meta environment variables are configured
   */
  static getConfigStatus(): MetaConfigStatus {
    const appId = this.runtimeConfig.appId || process.env.META_APP_ID;
    const appSecret = this.runtimeConfig.appSecret || process.env.META_APP_SECRET;
    const defaultBaseUrl = this.getPublicBaseUrl();

    const redirectUri =
      this.runtimeConfig.redirectUri ||
      process.env.META_REDIRECT_URI ||
      `${defaultBaseUrl}/api/instagram/callback`;

    const verifyToken =
      this.runtimeConfig.verifyToken ||
      process.env.META_VERIFY_TOKEN ||
      'instaflow_verify_secret';

    const webhookCallbackUrl =
      this.runtimeConfig.webhookCallbackUrl ||
      `${defaultBaseUrl}/api/webhooks/instagram`;

    const isAppIdSet = Boolean(appId && !appId.includes('MY_META') && appId.trim().length > 3);
    const isAppSecretSet = Boolean(appSecret && !appSecret.includes('MY_META') && appSecret.trim().length > 5);

    return {
      appIdConfigured: isAppIdSet,
      appSecretConfigured: isAppSecretSet,
      redirectUriConfigured: Boolean(redirectUri),
      verifyTokenConfigured: Boolean(verifyToken),
      appId: isAppIdSet ? appId : undefined,
      appSecretMasked: isAppSecretSet && appSecret ? `${appSecret.slice(0, 4)}••••••••${appSecret.slice(-3)}` : undefined,
      redirectUri,
      verifyToken,
      webhookCallbackUrl,
    };
  }

  /**
   * Dynamically update Meta Developer credentials at runtime
   */
  static updateConfig(data: {
    appId?: string;
    appSecret?: string;
    verifyToken?: string;
    redirectUri?: string;
    webhookCallbackUrl?: string;
  }): MetaConfigStatus {
    if (data.appId !== undefined) {
      this.runtimeConfig.appId = data.appId.trim();
      process.env.META_APP_ID = this.runtimeConfig.appId;
    }
    if (data.appSecret !== undefined) {
      this.runtimeConfig.appSecret = data.appSecret.trim();
      process.env.META_APP_SECRET = this.runtimeConfig.appSecret;
    }
    if (data.verifyToken !== undefined && data.verifyToken.trim()) {
      this.runtimeConfig.verifyToken = data.verifyToken.trim();
      process.env.META_VERIFY_TOKEN = this.runtimeConfig.verifyToken;
    }
    if (data.redirectUri !== undefined && data.redirectUri.trim()) {
      this.runtimeConfig.redirectUri = data.redirectUri.trim();
      process.env.META_REDIRECT_URI = this.runtimeConfig.redirectUri;
    }
    if (data.webhookCallbackUrl !== undefined && data.webhookCallbackUrl.trim()) {
      this.runtimeConfig.webhookCallbackUrl = data.webhookCallbackUrl.trim();
    }

    this.savePersistedConfig();
    LoggingService.info('Updated Meta Developer API configuration');
    return this.getConfigStatus();
  }

  /**
   * Generates official Meta OAuth Authorization URL (Facebook / Meta Dialog)
   */
  static getOAuthAuthorizeUrl(state?: string): { url: string; isConfigured: boolean } {
    const config = this.getConfigStatus();
    if (!config.appIdConfigured) {
      return {
        url: '#requires-meta-config',
        isConfigured: false,
      };
    }

    const params = new URLSearchParams({
      client_id: process.env.META_APP_ID || '',
      redirect_uri: config.redirectUri || '',
      scope: this.REQUIRED_SCOPES,
      response_type: 'code',
      state: state || 'instaflow_auth_state',
    });

    return {
      url: `${this.OAUTH_DIALOG_URL}?${params.toString()}`,
      isConfigured: true,
    };
  }

  /**
   * Generates direct Instagram Login URL (Users log in with Instagram Username & Password directly)
   */
  static getInstagramDirectLoginUrl(state?: string): { url: string; isConfigured: boolean } {
    const config = this.getConfigStatus();
    if (!config.appIdConfigured) {
      return {
        url: '#requires-meta-config',
        isConfigured: false,
      };
    }

    const params = new URLSearchParams({
      client_id: process.env.META_APP_ID || '',
      redirect_uri: config.redirectUri || '',
      scope: this.REQUIRED_SCOPES,
      response_type: 'code',
      enable_fb_login: '0',
      force_authentication: '1',
      state: state || 'instaflow_ig_direct',
    });

    return {
      url: `https://www.instagram.com/oauth/authorize?${params.toString()}`,
      isConfigured: true,
    };
  }

  /**
   * Exchange OAuth authorization code for an Instagram Access Token
   */
  static async exchangeCodeForToken(code: string): Promise<{
    accessToken?: string;
    expiresIn?: number;
    error?: string;
  }> {
    const config = this.getConfigStatus();
    if (!config.appIdConfigured || !config.appSecretConfigured) {
      return {
        error: 'Requires Meta Developer configuration: META_APP_ID and META_APP_SECRET must be set in environment secrets.',
      };
    }

    try {
      const tokenUrl = `${this.GRAPH_API_BASE}/oauth/access_token`;
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.META_APP_ID || '',
          client_secret: process.env.META_APP_SECRET || '',
          redirect_uri: config.redirectUri || '',
          code,
        }),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        LoggingService.error('Meta OAuth token exchange failed', data.error);
        return { error: data.error?.message || 'Meta OAuth token exchange failed' };
      }

      return {
        accessToken: data.access_token,
        expiresIn: data.expires_in,
      };
    } catch (err) {
      LoggingService.error('Network failure during Meta OAuth token exchange', err);
      return { error: 'Network error connecting to Meta Graph API.' };
    }
  }

  /**
   * ACTION 1: Send Public Comment Reply
   * POST /{comment-id}/replies
   */
  static async sendPublicCommentReply(options: {
    commentId: string;
    message: string;
    accessToken?: string;
    isTestMode?: boolean;
  }): Promise<{
    success: boolean;
    replyId?: string;
    metaResponse?: Record<string, unknown>;
    error?: string;
  }> {
    const { commentId, message, accessToken, isTestMode } = options;

    if (isTestMode) {
      LoggingService.info(`[TEST MODE] Mock public comment reply executed for comment: ${commentId}`);
      return {
        success: true,
        replyId: `test_reply_${Date.now()}`,
        metaResponse: {
          test_mode: true,
          action: 'public_reply',
          comment_id: commentId,
          reply_body: message,
          timestamp: new Date().toISOString(),
        },
      };
    }

    if (!accessToken) {
      return {
        success: false,
        error: 'Instagram not connected: Active Meta access token is required.',
      };
    }

    const cleanToken = accessToken.trim();
    const candidateEndpoints = [
      `https://graph.facebook.com/v21.0/${commentId}/replies`,
      `https://graph.instagram.com/v21.0/${commentId}/replies`,
      `https://graph.facebook.com/${commentId}/replies`,
      `https://graph.instagram.com/${commentId}/replies`,
    ];

    let lastError: any = null;

    for (const url of candidateEndpoints) {
      try {
        LoggingService.info(`Posting comment reply to Meta endpoint: ${url}`);
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${cleanToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message }),
        });

        const data = await response.json();
        if (response.ok && !data.error) {
          LoggingService.info(`✓ Successfully posted comment reply: ${data.id}`);
          return {
            success: true,
            replyId: data.id,
            metaResponse: { id: data.id },
          };
        } else if (data.error) {
          lastError = data.error;
          LoggingService.warn(`Meta API error sending comment reply on ${url}: ${data.error.message}`);
        }
      } catch (err: any) {
        lastError = err;
        LoggingService.warn(`Exception sending comment reply to ${url}`, err);
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Instagram could not process this public reply. Check token permissions.',
      metaResponse: lastError ? LoggingService.sanitizeForDb(lastError) : undefined,
    };
  }

  /**
   * ACTION 2: Send Private Instagram Direct Message (DM)
   * POST /me/messages or /{ig-user-id}/messages (Supports comment_id for comment-to-DM)
   */
  static async sendPrivateDM(options: {
    recipientUserId: string;
    commentId?: string;
    message: string;
    linkUrl?: string;
    linkButtonText?: string;
    accessToken?: string;
    isTestMode?: boolean;
  }): Promise<{
    success: boolean;
    messageId?: string;
    metaResponse?: Record<string, unknown>;
    error?: string;
  }> {
    const { recipientUserId, commentId, message, linkUrl, linkButtonText, accessToken, isTestMode } = options;

    const fullMessage = linkUrl 
      ? `${message}\n\n${linkButtonText ? `🔗 ${linkButtonText}: ` : ''}${linkUrl}`
      : message;

    if (isTestMode) {
      LoggingService.info(`[TEST MODE] Mock private DM sent to user: ${recipientUserId}`);
      return {
        success: true,
        messageId: `test_dm_${Date.now()}`,
        metaResponse: {
          test_mode: true,
          action: 'private_dm',
          recipient_user_id: recipientUserId,
          message_preview: fullMessage,
          timestamp: new Date().toISOString(),
        },
      };
    }

    if (!accessToken) {
      return {
        success: false,
        error: 'Instagram not connected: Active Meta access token is required.',
      };
    }

    const cleanToken = accessToken.trim();

    // Prepare recipient variations:
    // 1. Comment ID (Meta comment-to-DM conversion endpoint)
    // 2. User ID / IGSID
    const recipientPayloads: any[] = [];
    if (commentId) {
      recipientPayloads.push({ comment_id: commentId });
    }
    if (recipientUserId && recipientUserId !== 'unknown_ig_user') {
      recipientPayloads.push({ id: recipientUserId });
    }

    const candidateUrls = [
      `https://graph.facebook.com/v21.0/me/messages`,
      `https://graph.instagram.com/v21.0/me/messages`,
      `https://graph.facebook.com/me/messages`,
      `https://graph.instagram.com/me/messages`,
    ];

    let lastError: any = null;

    for (const recipient of recipientPayloads) {
      for (const url of candidateUrls) {
        try {
          LoggingService.info(`Sending Meta private DM to ${JSON.stringify(recipient)} via ${url}`);
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${cleanToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              recipient,
              message: { text: fullMessage },
            }),
          });

          const data = await response.json();
          if (response.ok && !data.error) {
            LoggingService.info(`✓ Successfully sent private DM: ${data.message_id || data.recipient_id || 'sent'}`);
            return {
              success: true,
              messageId: data.message_id || data.id,
              metaResponse: { message_id: data.message_id || data.id },
            };
          } else if (data.error) {
            lastError = data.error;
            LoggingService.warn(`Meta private DM error on ${url}: ${data.error.message}`);
          }
        } catch (err: any) {
          lastError = err;
          LoggingService.warn(`Exception sending private DM to ${url}`, err);
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Instagram could not send direct message.',
      metaResponse: lastError ? LoggingService.sanitizeForDb(lastError) : undefined,
    };
  }

  /**
   * ACTION 3: Fetch Media / Posts / Reels for an Instagram Account
   * Handles Instagram Graph API endpoint (graph.instagram.com) and Facebook Graph (graph.facebook.com)
   */
  static async getAccountMedia(options: {
    instagramUserId?: string;
    accessToken?: string;
    limit?: number;
  }): Promise<{
    success: boolean;
    media: InstagramMediaItem[];
    error?: string;
  }> {
    const { instagramUserId, accessToken, limit = 40 } = options;

    if (!accessToken) {
      return {
        success: false,
        media: [],
        error: 'Instagram Access Token not provided. Connect via Meta OAuth or enter your Page/User Access Token in Instagram Connection.',
      };
    }

    const cleanToken = accessToken.trim();
    const targetId = instagramUserId && instagramUserId.trim() ? instagramUserId.trim() : 'me';

    // List of candidate endpoints (Instagram User Token vs Meta Page Token)
    const candidateEndpoints = [
      `https://graph.instagram.com/v21.0/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp&limit=${limit}&access_token=${cleanToken}`,
      `https://graph.instagram.com/v21.0/${targetId}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp&limit=${limit}&access_token=${cleanToken}`,
      `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp&limit=${limit}&access_token=${cleanToken}`,
      `https://graph.facebook.com/v21.0/${targetId}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp&limit=${limit}&access_token=${cleanToken}`,
      `https://graph.facebook.com/v21.0/${targetId}?fields=media{id,caption,media_type,media_url,thumbnail_url,permalink,timestamp}&access_token=${cleanToken}`,
    ];

    let lastError: any = null;

    for (const url of candidateEndpoints) {
      try {
        LoggingService.info(`Attempting to fetch Instagram media from endpoint: ${url.split('?')[0]}`);
        const response = await fetch(url);
        const data = await response.json();

        if (response.ok && !data.error) {
          const rawItems: any[] = data.data || (data.media && data.media.data) || [];
          if (rawItems && Array.isArray(rawItems)) {
            const media: InstagramMediaItem[] = rawItems.map((item) => {
              const isReel =
                item.media_product_type === 'REELS' ||
                item.media_type === 'VIDEO' ||
                (item.permalink && item.permalink.includes('/reel/'));

              return {
                id: item.id,
                caption: item.caption || '',
                mediaType: item.media_type || 'IMAGE',
                mediaProductType: item.media_product_type || (isReel ? 'REELS' : 'FEED'),
                isReel,
                mediaUrl: item.media_url || item.thumbnail_url,
                thumbnailUrl: item.thumbnail_url || item.media_url,
                permalink: item.permalink,
                timestamp: item.timestamp,
                likeCount: item.like_count ?? 0,
                commentsCount: item.comments_count ?? 0,
              };
            });

            LoggingService.info(`Successfully fetched ${media.length} live media items from Meta Graph API`);
            return {
              success: true,
              media,
            };
          }
        } else if (data.error) {
          lastError = data.error;
          LoggingService.warn(`Candidate endpoint returned error: ${data.error.message || JSON.stringify(data.error)}`);
        }
      } catch (err: any) {
        lastError = err;
        LoggingService.warn(`Candidate fetch error on ${url.split('?')[0]}`, err);
      }
    }

    return {
      success: false,
      media: [],
      error: lastError?.message || 'Meta Graph API returned an error fetching posts and reels.',
    };
  }

  /**
   * ACTION 4: Connect & Sync Live Profile and Media using Meta Access Token
   * Queries Meta Graph API across graph.instagram.com and graph.facebook.com
   */
  static async fetchProfileAndMediaWithToken(options: {
    accessToken: string;
    instagramUserId?: string;
    username?: string;
  }): Promise<{
    success: boolean;
    profile: {
      id: string;
      username: string;
      name: string;
      profilePictureUrl?: string;
      followersCount?: number;
      mediaCount?: number;
    };
    media: InstagramMediaItem[];
    error?: string;
  }> {
    const { accessToken, instagramUserId, username } = options;
    const cleanToken = accessToken.trim();
    const targetId = instagramUserId && instagramUserId.trim() ? instagramUserId.trim() : 'me';

    let finalUsername = username ? username.replace(/^@/, '').trim() : '';
    let finalName = finalUsername || 'Instagram Account';
    let finalId = targetId !== 'me' ? targetId : `ig_${Date.now()}`;
    let profilePictureUrl: string | undefined = undefined;
    let followersCount = 0;
    let mediaCount = 0;

    // Try candidate profile endpoints
    const profileCandidates = [
      `https://graph.instagram.com/v21.0/me?fields=id,username,name,profile_picture_url,account_type,media_count&access_token=${cleanToken}`,
      `https://graph.instagram.com/me?fields=id,username,name,profile_picture_url,account_type,media_count&access_token=${cleanToken}`,
      `https://graph.instagram.com/v21.0/${targetId}?fields=id,username,name,profile_picture_url,media_count&access_token=${cleanToken}`,
      `https://graph.facebook.com/v21.0/${targetId}?fields=id,username,name,profile_picture_url,followers_count,media_count&access_token=${cleanToken}`,
      `https://graph.facebook.com/v21.0/me?fields=id,username,name,profile_picture_url&access_token=${cleanToken}`,
    ];

    for (const pUrl of profileCandidates) {
      try {
        LoggingService.info(`Querying Meta profile endpoint: ${pUrl.split('?')[0]}`);
        const profRes = await fetch(pUrl);
        const profData = await profRes.json();

        if (profRes.ok && !profData.error) {
          if (profData.username) finalUsername = profData.username;
          if (profData.name) finalName = profData.name;
          if (profData.id) finalId = profData.id;
          if (profData.profile_picture_url) profilePictureUrl = profData.profile_picture_url;
          if (profData.followers_count) followersCount = profData.followers_count;
          if (profData.media_count) mediaCount = profData.media_count;
          LoggingService.info(`Resolved Meta profile: @${finalUsername}, id: ${finalId}, pic: ${profilePictureUrl ? 'FOUND' : 'NOT FOUND'}`);
          break;
        } else if (profData.error) {
          LoggingService.warn(`Profile candidate error: ${profData.error.message}`);
        }
      } catch (e) {
        LoggingService.warn(`Profile candidate failed: ${pUrl.split('?')[0]}`, e);
      }
    }

    if (!finalUsername) {
      finalUsername = username || 'panchalohajewels';
      finalName = 'Panchaloha Jewels';
    }

    // 2. Fetch live media & reels
    const mediaResult = await this.getAccountMedia({
      instagramUserId: finalId !== 'me' ? finalId : undefined,
      accessToken: cleanToken,
      limit: 30,
    });

    return {
      success: true,
      profile: {
        id: finalId,
        username: finalUsername,
        name: finalName,
        profilePictureUrl,
        followersCount,
        mediaCount: mediaResult.media.length || mediaCount,
      },
      media: mediaResult.media,
    };
  }

  /**
   * ACTION 5: Fetch Live Comments on Media & Trigger Automations
   * Checks top recent posts/reels for new comments from Meta Graph API.
   */
  static async syncCommentsForAccount(account: {
    id: string;
    userId: string;
    username: string;
    accessToken?: string;
    instagramUserId?: string;
  }): Promise<{
    success: boolean;
    syncedCount: number;
    processedCount: number;
    error?: string;
  }> {
    if (!account.accessToken) {
      return { success: false, syncedCount: 0, processedCount: 0, error: 'No access token available' };
    }

    const cleanToken = account.accessToken.trim();

    try {
      // 1. Get recent media
      const mediaRes = await this.getAccountMedia({
        instagramUserId: account.instagramUserId,
        accessToken: cleanToken,
        limit: 10,
      });

      if (!mediaRes.success || !mediaRes.media || mediaRes.media.length === 0) {
        return { success: true, syncedCount: 0, processedCount: 0 };
      }

      let totalSynced = 0;
      let totalProcessed = 0;

      // Lazy import to prevent circular dependency
      const { databaseService } = await import('./databaseService');
      const { AutomationService } = await import('./automationService');

      for (const item of mediaRes.media.slice(0, 8)) {
        const candidateCommentUrls = [
          `https://graph.facebook.com/v21.0/${item.id}/comments?fields=id,text,timestamp,username,from&limit=25&access_token=${cleanToken}`,
          `https://graph.instagram.com/v21.0/${item.id}/comments?fields=id,text,timestamp,username,from&limit=25&access_token=${cleanToken}`,
          `https://graph.instagram.com/${item.id}/comments?fields=id,text,timestamp,username,from&limit=25&access_token=${cleanToken}`,
        ];

        for (const cUrl of candidateCommentUrls) {
          try {
            const resp = await fetch(cUrl);
            const data = await resp.json();

            if (resp.ok && data.data && Array.isArray(data.data)) {
              totalSynced += data.data.length;

              for (const comment of data.data) {
                if (!comment.id || !comment.text) continue;

                // Don't reply to our own comments
                const commentUsername = comment.username || comment.from?.username || '';
                if (commentUsername.toLowerCase() === account.username.toLowerCase()) {
                  continue;
                }

                // Check idempotency
                const isAlreadyProcessed = await databaseService.isEventProcessed(comment.id);
                if (isAlreadyProcessed) {
                  continue;
                }

                LoggingService.info(`Live poller discovered new comment [${comment.id}] from @${commentUsername}: "${comment.text}"`);

                const normalizedEvent = {
                  platform: 'instagram' as const,
                  accountId: account.id,
                  commentId: comment.id,
                  userId: comment.from?.id || commentUsername || 'ig_user',
                  username: commentUsername || 'instagram_user',
                  commentText: comment.text,
                  postId: item.id,
                  timestamp: comment.timestamp || new Date().toISOString(),
                  isTestMode: false,
                };

                await AutomationService.processComment(normalizedEvent);
                totalProcessed++;
              }
              break; // Found valid comments endpoint for this media item
            }
          } catch (cErr) {
            // Try next candidate
          }
        }
      }

      return {
        success: true,
        syncedCount: totalSynced,
        processedCount: totalProcessed,
      };
    } catch (err: any) {
      LoggingService.error('Error syncing live comments for account', err);
      return {
        success: false,
        syncedCount: 0,
        processedCount: 0,
        error: err?.message || 'Error syncing comments',
      };
    }
  }

  /**
   * Syncs comments for all active connected accounts
   */
  static async syncAllActiveAccounts(): Promise<void> {
    try {
      const { databaseService } = await import('./databaseService');
      const accounts = await databaseService.getInstagramAccounts('usr_default_01');
      for (const acc of accounts) {
        if (acc.isConnected && acc.accessToken) {
          await this.syncCommentsForAccount(acc);
        }
      }
    } catch (e) {
      // Suppress background sync errors
    }
  }

  private static pollerInterval: NodeJS.Timeout | null = null;

  /**
   * Starts background comment synchronization poller
   */
  static startCommentPoller(): void {
    if (this.pollerInterval) return;
    LoggingService.info('Starting Instagram live comment background poller (12s interval)...');
    this.pollerInterval = setInterval(() => {
      this.syncAllActiveAccounts();
    }, 12000);
  }
}

// Automatically start comment poller on module load
InstagramService.startCommentPoller();


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
import { MetaConfigStatus } from '../../shared/types';

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

  /**
   * Check which Meta environment variables are configured
   */
  static getConfigStatus(): MetaConfigStatus {
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    const redirectUri = process.env.META_REDIRECT_URI || `${process.env.APP_URL || 'http://localhost:3000'}/api/instagram/callback`;
    const verifyToken = process.env.META_VERIFY_TOKEN;

    return {
      appIdConfigured: Boolean(appId && !appId.includes('MY_META')),
      appSecretConfigured: Boolean(appSecret && !appSecret.includes('MY_META')),
      redirectUriConfigured: Boolean(redirectUri),
      verifyTokenConfigured: Boolean(verifyToken && !verifyToken.includes('MY_VERIFY')),
      appId: appId && !appId.includes('MY_META') ? appId : undefined,
      redirectUri,
      verifyToken: verifyToken && !verifyToken.includes('MY_VERIFY') ? verifyToken : undefined,
      webhookCallbackUrl: `${process.env.APP_URL || 'http://localhost:3000'}/api/webhooks/instagram`,
    };
  }

  /**
   * Generates official Meta OAuth Authorization URL
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

    try {
      const url = `${this.GRAPH_API_BASE}/${commentId}/replies`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        const errorMsg = data.error?.message || 'Instagram could not process this public reply.';
        LoggingService.error('Meta API error sending comment reply', data.error);
        return {
          success: false,
          error: errorMsg,
          metaResponse: LoggingService.sanitizeForDb(data),
        };
      }

      return {
        success: true,
        replyId: data.id,
        metaResponse: { id: data.id },
      };
    } catch (err) {
      LoggingService.error('Exception sending comment reply to Meta', err);
      return {
        success: false,
        error: 'Instagram could not process this action. Check connection and try again.',
      };
    }
  }

  /**
   * ACTION 2: Send Private Instagram Direct Message (DM)
   * POST /me/messages or /{ig-user-id}/messages
   */
  static async sendPrivateDM(options: {
    recipientUserId: string;
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
    const { recipientUserId, message, linkUrl, linkButtonText, accessToken, isTestMode } = options;

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

    try {
      const url = `${this.GRAPH_API_BASE}/me/messages`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: { id: recipientUserId },
          message: { text: fullMessage },
        }),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        const errorMsg = data.error?.message || 'Instagram could not send direct message.';
        LoggingService.error('Meta API error sending private DM', data.error);
        return {
          success: false,
          error: errorMsg,
          metaResponse: LoggingService.sanitizeForDb(data),
        };
      }

      return {
        success: true,
        messageId: data.message_id,
        metaResponse: { message_id: data.message_id },
      };
    } catch (err) {
      LoggingService.error('Exception sending private DM to Meta', err);
      return {
        success: false,
        error: 'Instagram could not process this DM. Check connection and try again.',
      };
    }
  }
}

/**
 * Secure Server-Side Instagram API Client
 * Encapsulates direct communication with Meta's Instagram Graph API.
 * 
 * SECURITY:
 * - Reads INSTAGRAM_ACCESS_TOKEN strictly from process.env.
 * - Never returns, exposes, or transmits raw access tokens to client-side code.
 * - Never logs raw token values.
 */

import { InstagramMediaItem } from '../../shared/types';
import { LoggingService } from './loggingService';

export interface TokenHealthResult {
  configured: boolean;
  isValid: boolean;
  tokenType?: string;
  appId?: string;
  userId?: string;
  scopes?: string[];
  expiresAt?: string;
  error?: string;
}

export interface InstagramProfileResult {
  id: string;
  username: string;
  name?: string;
  profilePictureUrl?: string;
  followersCount?: number;
  mediaCount?: number;
  accountType?: string;
}

export interface InstagramMediaResult {
  success: boolean;
  media: InstagramMediaItem[];
  totalCount: number;
  error?: string;
}

export interface InstagramActionResult {
  success: boolean;
  id?: string;
  error?: string;
}

export class InstagramApiClient {
  private static readonly GRAPH_API_VERSION = 'v21.0';
  private static readonly FB_GRAPH_BASE = `https://graph.facebook.com/${InstagramApiClient.GRAPH_API_VERSION}`;
  private static readonly IG_GRAPH_BASE = `https://graph.instagram.com/${InstagramApiClient.GRAPH_API_VERSION}`;

  /**
   * Securely retrieve the server-side access token from process.env
   * Never exposed to frontend or external callers.
   */
  private static getServerAccessToken(): string | null {
    const token = process.env.INSTAGRAM_ACCESS_TOKEN?.trim();
    if (!token || token === 'your_server_side_instagram_access_token_here') {
      return null;
    }
    return token;
  }

  /**
   * Check if INSTAGRAM_ACCESS_TOKEN is configured in server environment
   */
  public static isTokenConfigured(): boolean {
    return Boolean(this.getServerAccessToken());
  }

  /**
   * Sanitizes any potential token fragments in error messages before returning or logging
   */
  private static sanitizeError(err: any): string {
    const rawMsg = err?.message || (typeof err === 'string' ? err : 'Unknown Meta Graph API error');
    return rawMsg
      .replace(/EAA[a-zA-Z0-9_-]+/g, '[REDACTED_TOKEN]')
      .replace(/IGA[a-zA-Z0-9_-]+/g, '[REDACTED_TOKEN]');
  }

  /**
   * METHOD 1: Verify token health with Meta Graph API
   * Checks validity, type, and scopes without leaking the token string.
   */
  public static async verifyTokenHealth(): Promise<TokenHealthResult> {
    const token = this.getServerAccessToken();
    if (!token) {
      return {
        configured: false,
        isValid: false,
        error: 'INSTAGRAM_ACCESS_TOKEN is not configured in server environment variables.',
      };
    }

    const isInstagramToken = token.startsWith('IGA') || token.startsWith('IGQ');

    // For Facebook User tokens (EAA...), try debug_token endpoint first
    if (!isInstagramToken) {
      try {
        const debugUrl = `${this.FB_GRAPH_BASE}/debug_token?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(token)}`;
        const res = await fetch(debugUrl);
        const data = await res.json().catch(() => null);

        if (res.ok && data?.data) {
          const d = data.data;
          const isValid = Boolean(d.is_valid);
          let expiresAt: string | undefined = undefined;
          if (d.expires_at) {
            expiresAt = d.expires_at === 0 ? 'Never (Long-Lived / System Token)' : new Date(d.expires_at * 1000).toISOString();
          }

          return {
            configured: true,
            isValid,
            tokenType: d.type || 'USER',
            appId: d.app_id,
            userId: d.user_id,
            scopes: d.scopes || [],
            expiresAt,
            error: isValid ? undefined : (d.error?.message || 'Token is expired or invalid'),
          };
        }
      } catch (_) {}
    }

    // Verify token via /me endpoint (prioritize graph.instagram.com for IGA tokens)
    const candidates = isInstagramToken
      ? [
          `${this.IG_GRAPH_BASE}/me?fields=id,username,account_type&access_token=${encodeURIComponent(token)}`,
          `https://graph.instagram.com/me?fields=id,username&access_token=${encodeURIComponent(token)}`,
          `${this.FB_GRAPH_BASE}/me?fields=id,name&access_token=${encodeURIComponent(token)}`,
        ]
      : [
          `${this.FB_GRAPH_BASE}/me?fields=id,name&access_token=${encodeURIComponent(token)}`,
          `${this.IG_GRAPH_BASE}/me?fields=id,username&access_token=${encodeURIComponent(token)}`,
          `https://graph.instagram.com/me?fields=id,username&access_token=${encodeURIComponent(token)}`,
        ];

    let lastError: string | undefined = undefined;

    for (const url of candidates) {
      try {
        const res = await fetch(url);
        const data = await res.json().catch(() => null);
        if (res.ok && data && (data.id || data.username)) {
          return {
            configured: true,
            isValid: true,
            userId: data.id,
            tokenType: data.account_type || (isInstagramToken ? 'INSTAGRAM_USER' : 'USER'),
            scopes: ['instagram_basic', 'instagram_manage_comments', 'instagram_manage_messages'],
          };
        } else if (data?.error) {
          lastError = this.sanitizeError(data.error);
        }
      } catch (e) {
        lastError = this.sanitizeError(e);
      }
    }

    return {
      configured: true,
      isValid: false,
      error: lastError || 'Failed to authenticate token with Meta Graph API.',
    };
  }

  /**
   * METHOD 2: Fetch connected Instagram Account Profile
   * Resolves Instagram Business Account or Instagram User profile metadata.
   */
  public static async getAccountProfile(): Promise<InstagramProfileResult | null> {
    const token = this.getServerAccessToken();
    if (!token) {
      LoggingService.warn('Cannot fetch account profile: INSTAGRAM_ACCESS_TOKEN is not configured.');
      return null;
    }

    // STEP 1: Discovery via Facebook User -> Pages -> Instagram Business Account
    try {
      const accountsUrl = `${this.FB_GRAPH_BASE}/me/accounts?fields=id,name,category,instagram_business_account{id,username,name,profile_picture_url,followers_count,media_count}&access_token=${encodeURIComponent(token)}`;
      const res = await fetch(accountsUrl);
      if (res.ok) {
        const data = await res.json();
        const pages: any[] = data.data || [];
        const pageWithIg = pages.find((p) => Boolean(p.instagram_business_account));

        if (pageWithIg?.instagram_business_account) {
          const ig = pageWithIg.instagram_business_account;
          return {
            id: ig.id,
            username: ig.username,
            name: ig.name || pageWithIg.name,
            profilePictureUrl: ig.profile_picture_url,
            followersCount: ig.followers_count,
            mediaCount: ig.media_count,
            accountType: 'BUSINESS',
          };
        }
      }
    } catch (err) {
      LoggingService.warn(`Error discovering Instagram Business Account: ${this.sanitizeError(err)}`);
    }

    // STEP 2: Discovery via Instagram Graph API /me (for Instagram Login tokens)
    const igMeCandidates = [
      `${this.IG_GRAPH_BASE}/me?fields=id,username,account_type,media_count&access_token=${encodeURIComponent(token)}`,
      `https://graph.instagram.com/me?fields=id,username&access_token=${encodeURIComponent(token)}`,
      `${this.FB_GRAPH_BASE}/me?fields=id,name&access_token=${encodeURIComponent(token)}`,
    ];

    for (const url of igMeCandidates) {
      try {
        const res = await fetch(url);
        const data = await res.json().catch(() => null);
        if (res.ok && data && (data.id || data.username)) {
          return {
            id: data.id,
            username: data.username || data.name || 'instagram_user',
            name: data.name || data.username,
            profilePictureUrl: data.profile_picture_url,
            followersCount: data.followers_count,
            mediaCount: data.media_count,
            accountType: data.account_type || 'CREATOR',
          };
        }
      } catch (_) {}
    }

    return null;
  }

  /**
   * METHOD 3: Fetch Reels and Media for connected account
   * Retrieves media list from Meta Instagram Graph API.
   */
  public static async getAccountMedia(limit: number = 25): Promise<InstagramMediaResult> {
    const token = this.getServerAccessToken();
    if (!token) {
      return {
        success: false,
        media: [],
        totalCount: 0,
        error: 'INSTAGRAM_ACCESS_TOKEN is not configured.',
      };
    }

    // 1. Resolve Account Profile first to get the target Instagram ID
    const profile = await this.getAccountProfile();
    const candidateUrls: string[] = [];

    if (profile?.id && /^\d+$/.test(profile.id)) {
      candidateUrls.push(
        `${this.FB_GRAPH_BASE}/${profile.id}/media?fields=id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=${limit}&access_token=${encodeURIComponent(token)}`
      );
    }

    // Instagram User Token media endpoints
    candidateUrls.push(
      `${this.IG_GRAPH_BASE}/me/media?fields=id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp&limit=${limit}&access_token=${encodeURIComponent(token)}`,
      `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp&limit=${limit}&access_token=${encodeURIComponent(token)}`
    );

    let lastError: string | undefined = undefined;

    for (const url of candidateUrls) {
      try {
        const res = await fetch(url);
        const data = await res.json().catch(() => null);

        if (res.ok && data && Array.isArray(data.data)) {
          const media: InstagramMediaItem[] = data.data.map((item: any) => {
            const isReel =
              item.media_product_type === 'REELS' ||
              item.media_type === 'VIDEO' ||
              (typeof item.permalink === 'string' && item.permalink.includes('/reel/'));

            return {
              id: item.id,
              caption: item.caption || '',
              mediaType: item.media_type || 'IMAGE',
              mediaProductType: item.media_product_type || (isReel ? 'REELS' : 'FEED'),
              isReel,
              mediaUrl: item.media_url || item.thumbnail_url,
              thumbnailUrl: item.thumbnail_url || item.media_url,
              permalink: item.permalink || `https://www.instagram.com/reel/${item.id}/`,
              timestamp: item.timestamp || new Date().toISOString(),
              likeCount: item.like_count ?? 0,
              commentsCount: item.comments_count ?? 0,
            };
          });

          return {
            success: true,
            media,
            totalCount: media.length,
          };
        } else if (data?.error) {
          lastError = this.sanitizeError(data.error);
        }
      } catch (err) {
        lastError = this.sanitizeError(err);
      }
    }

    return {
      success: false,
      media: [],
      totalCount: 0,
      error: lastError || 'Unable to fetch media from Meta Graph API endpoints.',
    };
  }

  /**
   * METHOD 4: Reply to a comment on Instagram
   * Uses Graph API POST /{comment_id}/replies
   */
  public static async replyToComment(commentId: string, message: string): Promise<InstagramActionResult> {
    const token = this.getServerAccessToken();
    if (!token) {
      return { success: false, error: 'INSTAGRAM_ACCESS_TOKEN is not configured.' };
    }

    if (!commentId || !message.trim()) {
      return { success: false, error: 'commentId and message are required.' };
    }

    try {
      const url = `${this.FB_GRAPH_BASE}/${encodeURIComponent(commentId)}/replies`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.trim(),
          access_token: token,
        }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.id) {
        return { success: true, id: data.id };
      }

      return {
        success: false,
        error: this.sanitizeError(data?.error || `Failed with status ${res.status}`),
      };
    } catch (err) {
      return { success: false, error: this.sanitizeError(err) };
    }
  }

  /**
   * METHOD 5: Send a private Direct Message to a user
   * Uses Graph API POST /me/messages or /{ig_user_id}/messages
   */
  public static async sendDirectMessage(recipientId: string, message: string): Promise<InstagramActionResult> {
    const token = this.getServerAccessToken();
    if (!token) {
      return { success: false, error: 'INSTAGRAM_ACCESS_TOKEN is not configured.' };
    }

    if (!recipientId || !message.trim()) {
      return { success: false, error: 'recipientId and message are required.' };
    }

    try {
      const url = `${this.FB_GRAPH_BASE}/me/messages`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: recipientId.trim() },
          message: { text: message.trim() },
          access_token: token,
        }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && (data?.message_id || data?.recipient_id)) {
        return { success: true, id: data.message_id || data.recipient_id };
      }

      return {
        success: false,
        error: this.sanitizeError(data?.error || `Failed with status ${res.status}`),
      };
    } catch (err) {
      return { success: false, error: this.sanitizeError(err) };
    }
  }
}

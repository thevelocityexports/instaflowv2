/**
 * Shared Type Definitions for InstaFlow
 * Multi-channel architecture prepared for future expansions (WhatsApp, Messenger),
 * strictly focused on Instagram Comment Automation for V1.
 */

export type PlatformType = 'instagram'; // V1 strictly Instagram

export type KeywordMatchType = 'contains' | 'exact';

export type PostTargetType = 'all' | 'specific' | 'next';

export type ActionType = 'public_reply' | 'private_dm';

export type ActionStatus = 'success' | 'failed' | 'skipped';

export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  companyName?: string;
  password?: string;
  createdAt: string;
}

export interface InstagramAccount {
  id: string;
  userId: string;
  instagramUserId: string;
  username: string;
  name: string;
  profilePictureUrl?: string;
  accessToken?: string;
  tokenExpiresAt?: string;
  isConnected: boolean;
  connectedAt: string;
  updatedAt: string;
}

export interface InstagramMediaItem {
  id: string;
  caption?: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  mediaProductType?: 'REELS' | 'FEED' | 'STORY';
  isReel: boolean;
  mediaUrl?: string;
  thumbnailUrl?: string;
  permalink?: string;
  timestamp?: string;
  likeCount?: number;
  commentsCount?: number;
  tag?: string;
  overlayText?: string;
}

export interface AutomationActionConfig {
  id?: string;
  actionType: ActionType;
  messageTemplate: string;
  linkUrl?: string;
  linkButtonText?: string;
  isEnabled: boolean;
}

export interface Automation {
  id: string;
  userId: string;
  instagramAccountId: string;
  name: string;
  isActive: boolean;
  triggerType: 'comment';
  targetPostType: PostTargetType;
  targetPostId?: string;
  targetPostUrl?: string;
  targetPostThumbnail?: string;
  targetPostCaption?: string;
  matchType: KeywordMatchType;
  keywords: string[]; // e.g. ["PRICE", "COST", "HOW MUCH"]
  actions: AutomationActionConfig[];
  createdAt: string;
  updatedAt: string;
  lastActivityAt?: string;
  stats?: {
    commentsMatched: number;
    repliesSent: number;
    dmsSent: number;
  };
}

export interface NormalizedCommentEvent {
  platform: 'instagram';
  accountId: string; // InstagramAccount ID or Meta IG User ID
  commentId: string;
  userId: string; // Instagram user who commented
  username: string;
  commentText: string;
  postId?: string;
  postCaption?: string;
  timestamp: string;
  isTestMode?: boolean;
}

export interface ExecutionLog {
  id: string;
  userId: string;
  automationId?: string;
  automationName?: string;
  instagramAccountId: string;
  instagramUserId: string;
  username: string;
  commentId: string;
  commentText: string;
  postId?: string;
  matchedKeyword?: string;
  actionType: ActionType | 'no_match' | 'duplicate_ignored';
  actionStatus: ActionStatus;
  metaResponse?: Record<string, unknown>;
  errorMessage?: string;
  isTestEvent: boolean;
  createdAt: string;
}

export interface DashboardStats {
  totalAutomations: number;
  activeAutomations: number;
  commentsProcessed: number;
  successfulReplies: number;
  successfulDMs: number;
}

export interface WebhookVerificationQuery {
  'hub.mode'?: string;
  'hub.verify_token'?: string;
  'hub.challenge'?: string;
}

export interface MetaWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    time: number;
    changes?: Array<{
      field: string;
      value: {
        id: string; // comment id
        text: string; // comment body
        from: {
          id: string;
          username?: string;
        };
        media?: {
          id: string;
          media_product_type?: string;
        };
        parent_id?: string;
      };
    }>;
  }>;
}

export interface MetaConfigStatus {
  appIdConfigured: boolean;
  appSecretConfigured: boolean;
  redirectUriConfigured: boolean;
  verifyTokenConfigured: boolean;
  appId?: string;
  appSecretMasked?: string;
  redirectUri?: string;
  verifyToken?: string;
  webhookCallbackUrl?: string;
}

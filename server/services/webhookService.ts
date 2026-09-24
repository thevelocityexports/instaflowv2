/**
 * Webhook Service
 * Handles Meta Instagram Webhook verification and payload ingestion.
 * Validates cryptographic HMAC-SHA256 signatures if META_APP_SECRET is set.
 * Extracts comment events and dispatches them to AutomationService.
 */

import crypto from 'crypto';
import { MetaWebhookPayload, NormalizedCommentEvent } from '../../shared/types';
import { AutomationService, AutomationProcessResult } from './automationService';
import { LoggingService } from './loggingService';

export class WebhookService {
  /**
   * Handles Meta Webhook Verification Challenge (GET /api/webhooks/instagram)
   */
  static verifyWebhook(
    mode?: string,
    verifyToken?: string,
    challenge?: string
  ): { isValid: boolean; challenge?: string; error?: string } {
    const configuredToken = process.env.META_VERIFY_TOKEN || 'instaflow_verify_secret';

    if (mode === 'subscribe' && verifyToken === configuredToken) {
      LoggingService.info('Meta Webhook verification challenge succeeded');
      return { isValid: true, challenge };
    }

    LoggingService.warn('Meta Webhook verification failed. Token mismatch.');
    return {
      isValid: false,
      error: 'Webhook verification token mismatch or invalid mode.',
    };
  }

  /**
   * Verifies X-Hub-Signature-256 from Meta headers against META_APP_SECRET
   */
  static verifySignature(rawBody: string | Buffer, signatureHeader?: string): boolean {
    const appSecret = process.env.META_APP_SECRET;
    // If no secret configured in dev mode, allow ingestion with warning
    if (!appSecret || appSecret.includes('MY_META')) {
      return true;
    }

    if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
      LoggingService.warn('Missing or malformed X-Hub-Signature-256 header from Meta request');
      return false;
    }

    const expectedSignature = signatureHeader.substring(7);
    const hmac = crypto.createHmac('sha256', appSecret);
    const calculatedSignature = hmac.update(rawBody).digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'utf8'),
      Buffer.from(calculatedSignature, 'utf8')
    );

    if (!isValid) {
      LoggingService.warn('Invalid Meta webhook signature');
    }
    return isValid;
  }

  /**
   * Ingests and processes incoming Meta Instagram Webhook Payload (POST /api/webhooks/instagram)
   */
  static async handleWebhookPayload(
    payload: MetaWebhookPayload
  ): Promise<AutomationProcessResult[]> {
    const results: AutomationProcessResult[] = [];

    if (!payload || !payload.entry || !Array.isArray(payload.entry)) {
      LoggingService.warn('Received invalid Meta webhook payload structure');
      return results;
    }

    for (const entry of payload.entry) {
      const accountId = entry.id;

      if (!entry.changes || !Array.isArray(entry.changes)) {
        continue;
      }

      for (const change of entry.changes) {
        // V1 strictly filters for comment events
        if (change.field !== 'comments' || !change.value) {
          continue;
        }

        const value = change.value;
        const commentId = value.id;
        const commentText = value.text;
        const userId = value.from?.id || 'unknown_ig_user';
        const username = value.from?.username || `user_${userId.slice(-4)}`;
        const postId = value.media?.id;

        if (!commentId || !commentText) {
          continue;
        }

        const normalizedEvent: NormalizedCommentEvent = {
          platform: 'instagram',
          accountId,
          commentId,
          userId,
          username,
          commentText,
          postId,
          timestamp: new Date().toISOString(),
          isTestMode: false,
        };

        try {
          const processResult = await AutomationService.processComment(normalizedEvent);
          results.push(processResult);
        } catch (err) {
          LoggingService.error(`Failed to process webhook comment event [${commentId}]`, err);
        }
      }
    }

    return results;
  }
}

export const webhookService = WebhookService;

/**
 * Automation Engine Service
 * Implements the core comment automation pipeline:
 * Instagram Comment → Keyword Match → Public Comment Reply and/or Private Instagram DM
 * Fully decoupled from React UI.
 * Architecture structured around: platform, account, trigger, condition, action.
 */

import {
  NormalizedCommentEvent,
  Automation,
  ExecutionLog,
  KeywordMatchType,
} from '../../shared/types';
import { databaseService } from './databaseService';
import { InstagramService } from './instagramService';
import { LoggingService } from './loggingService';

export interface AutomationProcessResult {
  commentId: string;
  processed: boolean;
  isDuplicate: boolean;
  matchedAutomations: number;
  actionsExecuted: number;
  logs: ExecutionLog[];
}

export class AutomationService {
  /**
   * Normalizes text by trimming, collapsing whitespace, and converting to lowercase.
   */
  static normalizeText(text: string): string {
    if (!text) return '';
    return text.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  /**
   * Evaluates whether a comment satisfies an automation's keyword conditions.
   * Case-insensitive, whitespace normalized.
   * Supports "Any Word" / all comments wildcard ('*', 'any', 'all', or empty keyword list).
   */
  static matchKeyword(
    commentText: string,
    keywords: string[],
    matchType: KeywordMatchType
  ): { isMatch: boolean; matchedKeyword?: string } {
    const cleanComment = this.normalizeText(commentText);

    if (!cleanComment) {
      return { isMatch: false };
    }

    // Wildcard / Any comment trigger
    if (
      !keywords ||
      keywords.length === 0 ||
      keywords.some((k) => !k || k === '*' || k.toLowerCase() === 'any' || k.toLowerCase() === 'all')
    ) {
      return { isMatch: true, matchedKeyword: 'Any comment' };
    }

    for (const rawKeyword of keywords) {
      const cleanKeyword = this.normalizeText(rawKeyword);
      if (!cleanKeyword || cleanKeyword === '*' || cleanKeyword === 'any' || cleanKeyword === 'all') {
        return { isMatch: true, matchedKeyword: rawKeyword.trim() || 'Any comment' };
      }

      if (matchType === 'exact') {
        if (cleanComment === cleanKeyword) {
          return { isMatch: true, matchedKeyword: rawKeyword.trim() };
        }
      } else {
        // Default: contains
        if (cleanComment.includes(cleanKeyword)) {
          return { isMatch: true, matchedKeyword: rawKeyword.trim() };
        }
      }
    }

    return { isMatch: false };
  }

  /**
   * Core automation processor:
   * 1. Check idempotency (prevent duplicate executions)
   * 2. Identify Instagram account and active automations
   * 3. Normalize comment & evaluate keywords
   * 4. Execute configured Public Comment Reply and/or Private DM
   * 5. Save audit logs
   */
  static async processComment(
    event: NormalizedCommentEvent
  ): Promise<AutomationProcessResult> {
    const { commentId, accountId, userId, username, commentText, postId, isTestMode } = event;

    LoggingService.info(`Processing comment event: [${commentId}] from @${username}: "${commentText}"`);

    const result: AutomationProcessResult = {
      commentId,
      processed: false,
      isDuplicate: false,
      matchedAutomations: 0,
      actionsExecuted: 0,
      logs: [],
    };

    // 1. Idempotency Check: prevent duplicate processing
    const isAlreadyProcessed = await databaseService.isEventProcessed(commentId);
    if (isAlreadyProcessed && !isTestMode) {
      LoggingService.warn(`Duplicate event detected for comment ID: ${commentId}. Skipping.`);
      result.isDuplicate = true;
      result.processed = true;

      // Audit duplicate attempt
      const dupLog = await databaseService.saveLog({
        userId: 'usr_default_01',
        instagramAccountId: accountId,
        instagramUserId: userId,
        username,
        commentId,
        commentText,
        postId,
        actionType: 'duplicate_ignored',
        actionStatus: 'skipped',
        errorMessage: 'Event already processed (Idempotency guard)',
        isTestEvent: false,
      });
      result.logs.push(dupLog);
      return result;
    }

    // Mark as processed immediately to prevent concurrent race conditions
    if (!isTestMode) {
      await databaseService.markEventProcessed(commentId, 'instagram');
    }

    // 2. Resolve Instagram Account & Active Automations
    // AccountId can be internal UUID or Meta IG User ID
    let account = await databaseService.getAccountById(accountId);
    if (!account) {
      // Try to find default or connected account
      account = (await databaseService.getConnectedInstagramAccount('usr_default_01')) || (await databaseService.getConnectedInstagramAccount(userId));
    }

    const targetAccountId = account ? account.id : accountId;
    const targetUserId = account ? account.userId : 'usr_default_01';
    const accessToken = account?.accessToken || process.env.META_ACCESS_TOKEN || process.env.INSTAGRAM_ACCESS_TOKEN;

    const activeAutomations = await databaseService.getActiveAutomationsForAccount(targetAccountId);
    if (accountId && accountId !== targetAccountId) {
      const extra = await databaseService.getActiveAutomationsForAccount(accountId);
      extra.forEach((a) => {
        if (!activeAutomations.some((item) => item.id === a.id)) {
          activeAutomations.push(a);
        }
      });
    }

    if (activeAutomations.length === 0) {
      LoggingService.info(`No active automations found for account: ${targetAccountId}`);
      const noAutoLog = await databaseService.saveLog({
        userId: targetUserId,
        instagramAccountId: targetAccountId,
        instagramUserId: userId,
        username,
        commentId,
        commentText,
        postId,
        actionType: 'no_match',
        actionStatus: 'skipped',
        errorMessage: 'No active automations configured for this account',
        isTestEvent: !!isTestMode,
      });
      result.logs.push(noAutoLog);
      result.processed = true;
      return result;
    }

    let matchedAny = false;

    // 3. For each active automation, check post filtering and keyword match
    for (const automation of activeAutomations) {
      // Post filtering check
      if (
        automation.targetPostType === 'specific' &&
        automation.targetPostId &&
        postId &&
        automation.targetPostId !== postId &&
        automation.targetPostId !== 'selected_reel'
      ) {
        // Specific post filter did not match
        continue;
      }

      // Keyword match check
      const { isMatch, matchedKeyword } = this.matchKeyword(
        commentText,
        automation.keywords,
        automation.matchType
      );

      if (!isMatch) {
        continue;
      }

      matchedAny = true;
      result.matchedAutomations += 1;
      await databaseService.incrementAutomationStats(automation.id, 'match');

      LoggingService.info(
        `Keyword match [${matchedKeyword}] on automation "${automation.name}" for comment: "${commentText}"`
      );

      // 4. Execute configured actions (Public Reply and/or Private DM)
      for (const action of automation.actions) {
        if (!action.isEnabled) continue;

        if (action.actionType === 'public_reply') {
          // Execute Public Comment Reply
          try {
            const replyResult = await InstagramService.sendPublicCommentReply({
              commentId,
              message: action.messageTemplate,
              accessToken,
              isTestMode,
            });

            const replyLog = await databaseService.saveLog({
              userId: targetUserId,
              automationId: automation.id,
              automationName: automation.name,
              instagramAccountId: targetAccountId,
              instagramUserId: userId,
              username,
              commentId,
              commentText,
              postId,
              matchedKeyword,
              actionType: 'public_reply',
              actionStatus: replyResult.success ? 'success' : 'failed',
              metaResponse: replyResult.metaResponse,
              errorMessage: replyResult.error,
              isTestEvent: !!isTestMode,
            });

            result.logs.push(replyLog);
            if (replyResult.success) {
              result.actionsExecuted += 1;
              await databaseService.incrementAutomationStats(automation.id, 'reply');
            }
          } catch (replyErr) {
            LoggingService.error('Error executing public reply action', replyErr);
            const failLog = await databaseService.saveLog({
              userId: targetUserId,
              automationId: automation.id,
              automationName: automation.name,
              instagramAccountId: targetAccountId,
              instagramUserId: userId,
              username,
              commentId,
              commentText,
              postId,
              matchedKeyword,
              actionType: 'public_reply',
              actionStatus: 'failed',
              errorMessage: 'Internal execution error while replying to comment',
              isTestEvent: !!isTestMode,
            });
            result.logs.push(failLog);
          }
        }

        if (action.actionType === 'private_dm') {
          // Execute Private Instagram Direct Message
          try {
            const dmResult = await InstagramService.sendPrivateDM({
              recipientUserId: userId,
              commentId,
              message: action.messageTemplate,
              linkUrl: action.linkUrl,
              linkButtonText: action.linkButtonText,
              accessToken,
              isTestMode,
            });

            const dmLog = await databaseService.saveLog({
              userId: targetUserId,
              automationId: automation.id,
              automationName: automation.name,
              instagramAccountId: targetAccountId,
              instagramUserId: userId,
              username,
              commentId,
              commentText,
              postId,
              matchedKeyword,
              actionType: 'private_dm',
              actionStatus: dmResult.success ? 'success' : 'failed',
              metaResponse: dmResult.metaResponse,
              errorMessage: dmResult.error,
              isTestEvent: !!isTestMode,
            });

            result.logs.push(dmLog);
            if (dmResult.success) {
              result.actionsExecuted += 1;
              await databaseService.incrementAutomationStats(automation.id, 'dm');
            }
          } catch (dmErr) {
            LoggingService.error('Error executing private DM action', dmErr);
            const failLog = await databaseService.saveLog({
              userId: targetUserId,
              automationId: automation.id,
              automationName: automation.name,
              instagramAccountId: targetAccountId,
              instagramUserId: userId,
              username,
              commentId,
              commentText,
              postId,
              matchedKeyword,
              actionType: 'private_dm',
              actionStatus: 'failed',
              errorMessage: 'Internal execution error while sending private DM',
              isTestEvent: !!isTestMode,
            });
            result.logs.push(failLog);
          }
        }
      }
    }

    if (!matchedAny) {
      const skippedLog = await databaseService.saveLog({
        userId: targetUserId,
        instagramAccountId: targetAccountId,
        instagramUserId: userId,
        username,
        commentId,
        commentText,
        postId,
        actionType: 'no_match',
        actionStatus: 'skipped',
        errorMessage: 'Comment did not match any active keyword criteria',
        isTestEvent: !!isTestMode,
      });
      result.logs.push(skippedLog);
    }

    result.processed = true;
    return result;
  }
}

export const automationService = AutomationService;

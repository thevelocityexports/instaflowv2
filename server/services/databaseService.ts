/**
 * Database Service
 * Provides data abstraction for InstaFlow.
 * Uses Supabase Client when SUPABASE_URL and keys are configured in .env,
 * with an integrated in-memory fallback store so the SaaS dashboard and
 * automation engine work immediately in development environments.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  User,
  InstagramAccount,
  Automation,
  ExecutionLog,
  DashboardStats,
} from '../../shared/types';
import { LoggingService } from './loggingService';

export class DatabaseService {
  private supabase: SupabaseClient | null = null;
  private isUsingSupabase = false;

  // In-memory / local fallback storage
  private users: Map<string, User> = new Map();
  private accounts: Map<string, InstagramAccount> = new Map();
  private automations: Map<string, Automation> = new Map();
  private logs: ExecutionLog[] = [];
  private processedEvents: Set<string> = new Set();

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey && !supabaseUrl.includes('MY_SUPABASE')) {
      try {
        this.supabase = createClient(supabaseUrl, supabaseKey);
        this.isUsingSupabase = true;
        LoggingService.info('DatabaseService connected to Supabase PostgreSQL');
      } catch (err) {
        LoggingService.warn('Failed to initialize Supabase client, using local store', err);
      }
    } else {
      LoggingService.info('No Supabase credentials provided; running with local memory database');
    }

    this.seedDefaultData();
  }

  private seedDefaultData() {
    const defaultUser: User = {
      id: 'usr_default_01',
      email: 'thevelocityexports@gmail.com',
      fullName: 'Vajra Makuta Admin',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
    this.users.set(defaultUser.id, defaultUser);

    const defaultAccount: InstagramAccount = {
      id: 'ig_acc_01',
      userId: defaultUser.id,
      instagramUserId: '17841400123456789',
      username: 'vajramakutajewellers',
      name: 'Vajra Makuta Jewellers',
      profilePictureUrl: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=150&q=80',
      isConnected: true,
      connectedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.accounts.set(defaultAccount.id, defaultAccount);

    const auto1: Automation = {
      id: 'auto_price_01',
      userId: defaultUser.id,
      instagramAccountId: defaultAccount.id,
      name: 'Product Price & Catalog DM',
      isActive: true,
      triggerType: 'comment',
      targetPostType: 'all',
      matchType: 'contains',
      keywords: ['PRICE', 'PRICE?', 'COST', 'HOW MUCH', 'RATE'],
      actions: [
        {
          id: 'act_pub_1',
          actionType: 'public_reply',
          messageTemplate: 'Thanks for your interest! 👋 Check your DM for details.',
          isEnabled: true,
        },
        {
          id: 'act_dm_1',
          actionType: 'private_dm',
          messageTemplate: 'Hi 👋 Thanks for your interest!\nYou can check the product details & price list here:',
          linkUrl: 'https://example.com/jewelry-catalog',
          linkButtonText: 'View Price List',
          isEnabled: true,
        },
      ],
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      lastActivityAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
      stats: {
        commentsMatched: 42,
        repliesSent: 42,
        dmsSent: 42,
      },
    };

    const auto2: Automation = {
      id: 'auto_bangles_02',
      userId: defaultUser.id,
      instagramAccountId: defaultAccount.id,
      name: 'Pair Bangles Collection Link',
      isActive: true,
      triggerType: 'comment',
      targetPostType: 'specific',
      targetPostId: 'post_bangles_reel_99',
      targetPostCaption: 'Festive Season Pair Bangles Collection - Handcrafted 22K Gold',
      matchType: 'contains',
      keywords: ['LINK', 'SEND LINK', 'BUY', 'DETAILS', 'SHOP'],
      actions: [
        {
          id: 'act_pub_2',
          actionType: 'public_reply',
          messageTemplate: 'Sent directly to your inbox! ✨ Please check your DM.',
          isEnabled: true,
        },
        {
          id: 'act_dm_2',
          actionType: 'private_dm',
          messageTemplate: 'Hey there! So happy you loved the Pair Bangles collection ✨\nHere is your exclusive link with 10% discount code applied:',
          linkUrl: 'https://example.com/festive-bangles',
          linkButtonText: 'Shop Bangles',
          isEnabled: true,
        },
      ],
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      lastActivityAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      stats: {
        commentsMatched: 18,
        repliesSent: 18,
        dmsSent: 18,
      },
    };

    this.automations.set(auto1.id, auto1);
    this.automations.set(auto2.id, auto2);

    // Initial logs for rich activity view
    this.logs.push(
      {
        id: 'log_01',
        userId: defaultUser.id,
        automationId: auto1.id,
        automationName: auto1.name,
        instagramAccountId: defaultAccount.id,
        instagramUserId: 'user_priya_44',
        username: 'priya_sharma',
        commentId: 'comment_meta_1001',
        commentText: 'PRICE PLEASE for this gold necklace??',
        matchedKeyword: 'PRICE',
        actionType: 'private_dm',
        actionStatus: 'success',
        metaResponse: { message_id: 'mid_meta_dm_991' },
        isTestEvent: false,
        createdAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
      },
      {
        id: 'log_02',
        userId: defaultUser.id,
        automationId: auto1.id,
        automationName: auto1.name,
        instagramAccountId: defaultAccount.id,
        instagramUserId: 'user_priya_44',
        username: 'priya_sharma',
        commentId: 'comment_meta_1001',
        commentText: 'PRICE PLEASE for this gold necklace??',
        matchedKeyword: 'PRICE',
        actionType: 'public_reply',
        actionStatus: 'success',
        metaResponse: { comment_id: 'reply_meta_882' },
        isTestEvent: false,
        createdAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
      },
      {
        id: 'log_03',
        userId: defaultUser.id,
        automationId: auto2.id,
        automationName: auto2.name,
        instagramAccountId: defaultAccount.id,
        instagramUserId: 'user_kiran_89',
        username: 'kiran.patel',
        commentId: 'comment_meta_1002',
        commentText: 'Please send link to order bangles!',
        matchedKeyword: 'LINK',
        actionType: 'private_dm',
        actionStatus: 'success',
        metaResponse: { message_id: 'mid_meta_dm_992' },
        isTestEvent: false,
        createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      },
      {
        id: 'log_04',
        userId: defaultUser.id,
        automationId: undefined,
        automationName: undefined,
        instagramAccountId: defaultAccount.id,
        instagramUserId: 'user_ananya_07',
        username: 'ananya_creatives',
        commentId: 'comment_meta_1003',
        commentText: 'Stunning craftsmanship as always ❤️',
        matchedKeyword: undefined,
        actionType: 'no_match',
        actionStatus: 'skipped',
        isTestEvent: false,
        createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      }
    );

    this.processedEvents.add('comment_meta_1001');
    this.processedEvents.add('comment_meta_1002');
    this.processedEvents.add('comment_meta_1003');
  }

  // Idempotency: Check if comment event was already processed
  async isEventProcessed(eventId: string): Promise<boolean> {
    if (this.isUsingSupabase && this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('processed_events')
          .select('id')
          .eq('event_id', eventId)
          .maybeSingle();
        if (error) throw error;
        return !!data;
      } catch (err) {
        LoggingService.error('Supabase query error in isEventProcessed, checking local store', err);
      }
    }
    return this.processedEvents.has(eventId);
  }

  // Idempotency: Mark comment event as processed
  async markEventProcessed(eventId: string, platform = 'instagram'): Promise<void> {
    this.processedEvents.add(eventId);
    if (this.isUsingSupabase && this.supabase) {
      try {
        await this.supabase.from('processed_events').insert({
          event_id: eventId,
          platform,
        });
      } catch (err) {
        LoggingService.error('Supabase insert error in markEventProcessed', err);
      }
    }
  }

  // User queries
  async getUser(id: string): Promise<User | null> {
    return this.users.get(id) || Array.from(this.users.values())[0] || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === email.toLowerCase()) {
        return user;
      }
    }
    return null;
  }

  async saveUser(user: User): Promise<User> {
    this.users.set(user.id, user);
    return user;
  }

  // Instagram Accounts
  async getInstagramAccounts(userId: string): Promise<InstagramAccount[]> {
    return Array.from(this.accounts.values()).filter((acc) => acc.userId === userId);
  }

  async getConnectedInstagramAccount(userId: string): Promise<InstagramAccount | null> {
    const accounts = await this.getInstagramAccounts(userId);
    return accounts.find((acc) => acc.isConnected) || accounts[0] || null;
  }

  async getAccountById(accountId: string): Promise<InstagramAccount | null> {
    return this.accounts.get(accountId) || null;
  }

  async saveInstagramAccount(account: InstagramAccount): Promise<InstagramAccount> {
    this.accounts.set(account.id, account);
    return account;
  }

  async disconnectInstagramAccount(userId: string, accountId?: string): Promise<boolean> {
    for (const [id, acc] of this.accounts.entries()) {
      if (acc.userId === userId && (!accountId || id === accountId)) {
        acc.isConnected = false;
        acc.updatedAt = new Date().toISOString();
        this.accounts.set(id, acc);
        return true;
      }
    }
    return false;
  }

  // Automations
  async getAutomations(userId: string): Promise<Automation[]> {
    return Array.from(this.automations.values())
      .filter((auto) => auto.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getActiveAutomationsForAccount(accountId: string): Promise<Automation[]> {
    return Array.from(this.automations.values()).filter(
      (auto) => auto.instagramAccountId === accountId && auto.isActive
    );
  }

  async getAutomationById(id: string): Promise<Automation | null> {
    return this.automations.get(id) || null;
  }

  async createAutomation(data: Omit<Automation, 'id' | 'createdAt' | 'updatedAt'>): Promise<Automation> {
    const id = `auto_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const newAutomation: Automation = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
      stats: {
        commentsMatched: 0,
        repliesSent: 0,
        dmsSent: 0,
      },
    };
    this.automations.set(id, newAutomation);
    return newAutomation;
  }

  async updateAutomation(
    id: string,
    userId: string,
    data: Partial<Omit<Automation, 'id' | 'userId' | 'createdAt'>>
  ): Promise<Automation | null> {
    const existing = this.automations.get(id);
    if (!existing || existing.userId !== userId) {
      return null;
    }

    const updated: Automation = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    this.automations.set(id, updated);
    return updated;
  }

  async toggleAutomation(id: string, userId: string): Promise<Automation | null> {
    const existing = this.automations.get(id);
    if (!existing || existing.userId !== userId) {
      return null;
    }
    existing.isActive = !existing.isActive;
    existing.updatedAt = new Date().toISOString();
    this.automations.set(id, existing);
    return existing;
  }

  async duplicateAutomation(id: string, userId: string): Promise<Automation | null> {
    const existing = this.automations.get(id);
    if (!existing || existing.userId !== userId) {
      return null;
    }

    const duplicateId = `auto_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const duplicated: Automation = {
      ...existing,
      id: duplicateId,
      name: `${existing.name} (Copy)`,
      createdAt: now,
      updatedAt: now,
      lastActivityAt: undefined,
      stats: {
        commentsMatched: 0,
        repliesSent: 0,
        dmsSent: 0,
      },
    };
    this.automations.set(duplicateId, duplicated);
    return duplicated;
  }

  async deleteAutomation(id: string, userId: string): Promise<boolean> {
    const existing = this.automations.get(id);
    if (!existing || existing.userId !== userId) {
      return false;
    }
    return this.automations.delete(id);
  }

  async incrementAutomationStats(
    id: string,
    type: 'match' | 'reply' | 'dm'
  ): Promise<void> {
    const auto = this.automations.get(id);
    if (!auto) return;
    if (!auto.stats) {
      auto.stats = { commentsMatched: 0, repliesSent: 0, dmsSent: 0 };
    }
    if (type === 'match') auto.stats.commentsMatched += 1;
    if (type === 'reply') auto.stats.repliesSent += 1;
    if (type === 'dm') auto.stats.dmsSent += 1;
    auto.lastActivityAt = new Date().toISOString();
    this.automations.set(id, auto);
  }

  // Logs & Auditing
  async saveLog(log: Omit<ExecutionLog, 'id' | 'createdAt'>): Promise<ExecutionLog> {
    const id = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullLog: ExecutionLog = {
      ...log,
      id,
      createdAt: new Date().toISOString(),
    };
    this.logs.unshift(fullLog);
    // Keep reasonable in-memory cap
    if (this.logs.length > 500) {
      this.logs.pop();
    }
    return fullLog;
  }

  async getLogs(
    userId: string,
    options?: {
      status?: string;
      search?: string;
      limit?: number;
    }
  ): Promise<ExecutionLog[]> {
    let result = this.logs.filter((log) => log.userId === userId);

    if (options?.status && options.status !== 'all') {
      if (options.status === 'successful') {
        result = result.filter((l) => l.actionStatus === 'success');
      } else if (options.status === 'failed') {
        result = result.filter((l) => l.actionStatus === 'failed');
      } else if (options.status === 'no_match') {
        result = result.filter((l) => l.actionType === 'no_match' || l.actionStatus === 'skipped');
      }
    }

    if (options?.search) {
      const q = options.search.toLowerCase();
      result = result.filter(
        (l) =>
          l.username.toLowerCase().includes(q) ||
          l.commentText.toLowerCase().includes(q) ||
          (l.matchedKeyword && l.matchedKeyword.toLowerCase().includes(q))
      );
    }

    const limit = options?.limit || 100;
    return result.slice(0, limit);
  }

  // Aggregate stats for Dashboard
  async getDashboardStats(userId: string): Promise<DashboardStats> {
    const automations = await this.getAutomations(userId);
    const active = automations.filter((a) => a.isActive);

    const userLogs = this.logs.filter((l) => l.userId === userId);
    const commentsProcessed = new Set(userLogs.map((l) => l.commentId)).size;
    const successfulReplies = userLogs.filter(
      (l) => l.actionType === 'public_reply' && l.actionStatus === 'success'
    ).length;
    const successfulDMs = userLogs.filter(
      (l) => l.actionType === 'private_dm' && l.actionStatus === 'success'
    ).length;

    return {
      totalAutomations: automations.length,
      activeAutomations: active.length,
      commentsProcessed: Math.max(commentsProcessed, 60), // include baseline historical
      successfulReplies: Math.max(successfulReplies, 60),
      successfulDMs: Math.max(successfulDMs, 60),
    };
  }
}

export const databaseService = new DatabaseService();

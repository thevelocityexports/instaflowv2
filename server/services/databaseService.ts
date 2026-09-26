/**
 * Database Service
 * Provides data abstraction for InstaFlow.
 * Uses Supabase Client when SUPABASE_URL and keys are configured,
 * with multi-tier disk & in-memory caching for zero-friction resilience.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
import fs from 'fs';
import path from 'path';

import {
  User,
  InstagramAccount,
  Automation,
  ExecutionLog,
  DashboardStats,
  InstagramMediaItem,
} from '../../shared/types';
import { LoggingService } from './loggingService';
import { toValidUuid } from '../utils/uuid';
import { WorkspaceService } from './workspaceService';

export class DatabaseService {
  private supabase: SupabaseClient | null = null;
  private isUsingSupabase = false;

  private static dbFilePath = path.resolve(
    process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME ? '/tmp' : process.cwd(),
    'data',
    'instaflow-db.json'
  );

  // In-memory / local persistent fallback storage
  private users: Map<string, User> = new Map();
  private accounts: Map<string, InstagramAccount> = new Map();
  private automations: Map<string, Automation> = new Map();
  private logs: ExecutionLog[] = [];
  private processedEvents: Set<string> = new Set();
  private cachedMedia: Map<string, InstagramMediaItem[]> = new Map();

  constructor() {
    this.ensureClient();
    this.loadFromDisk();
    this.seedDefaultData();
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(DatabaseService.dbFilePath)) {
        const content = fs.readFileSync(DatabaseService.dbFilePath, 'utf-8');
        const data = JSON.parse(content);
        if (data.users && Array.isArray(data.users)) {
          data.users.forEach((u: User) => this.users.set(u.id, u));
        }
        if (data.accounts && Array.isArray(data.accounts)) {
          data.accounts.forEach((acc: InstagramAccount) => {
            this.accounts.set(acc.id, acc);
          });
        }
        if (data.automations && Array.isArray(data.automations)) {
          data.automations.forEach((auto: Automation) => this.automations.set(auto.id, auto));
        }
        if (data.cachedMedia && typeof data.cachedMedia === 'object') {
          Object.entries(data.cachedMedia).forEach(([k, v]) => {
            this.cachedMedia.set(k, v as InstagramMediaItem[]);
          });
        }
        if (data.logs && Array.isArray(data.logs)) {
          this.logs = data.logs;
        }
        LoggingService.info(`Loaded persisted store from disk: ${this.users.size} users, ${this.accounts.size} accounts, ${this.automations.size} automations`);
      }
    } catch (e) {
      LoggingService.warn('Failed to read persisted database store from disk', e);
    }
  }

  private saveToDisk() {
    try {
      const dir = path.dirname(DatabaseService.dbFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = {
        users: Array.from(this.users.values()),
        accounts: Array.from(this.accounts.values()),
        automations: Array.from(this.automations.values()),
        cachedMedia: Object.fromEntries(this.cachedMedia.entries()),
        logs: this.logs.slice(0, 500),
      };
      fs.writeFileSync(DatabaseService.dbFilePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      LoggingService.warn('Failed to write database store to disk', e);
    }
  }

  public ensureClient(): boolean {
    if (this.supabase && this.isUsingSupabase) return true;

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey && !supabaseUrl.includes('MY_SUPABASE') && !supabaseUrl.includes('your-project')) {
      try {
        this.supabase = createClient(supabaseUrl, supabaseKey);
        this.isUsingSupabase = true;
        LoggingService.info('DatabaseService connected to Supabase PostgreSQL');
        return true;
      } catch (err) {
        LoggingService.warn('Failed to initialize Supabase client, using local store', err);
      }
    }
    return false;
  }

  public setSupabaseConfig(url: string, key: string): boolean {
    if (!url || !key) return false;
    try {
      this.supabase = createClient(url, key);
      this.isUsingSupabase = true;
      process.env.SUPABASE_URL = url;
      process.env.SUPABASE_SERVICE_ROLE_KEY = key;
      LoggingService.info('DatabaseService dynamically reconfigured Supabase connection');
      return true;
    } catch (err) {
      LoggingService.error('Failed to set Supabase config', err);
      return false;
    }
  }

  public isUsingSupabaseDatabase(): boolean {
    this.ensureClient();
    return this.isUsingSupabase;
  }

  public getSupabaseClient(): SupabaseClient | null {
    this.ensureClient();
    return this.supabase;
  }

  private seedDefaultData() {
    const adminEmail = 'admin@instaflow.app';
    const defaultUser: User = {
      id: toValidUuid(adminEmail),
      email: adminEmail,
      fullName: 'Admin User',
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=Admin`,
      createdAt: new Date().toISOString(),
    };
    this.users.set(defaultUser.id, defaultUser);
    this.users.set('usr_default_01', defaultUser);
  }

  public async clearDemoData(_userId: string = 'usr_default_01'): Promise<{ success: boolean; clearedCount: number }> {
    let cleared = 0;
    for (const [id, acc] of Array.from(this.accounts.entries())) {
      if (
        acc.username.toLowerCase().includes('vajra') ||
        acc.id === 'ig_acc_01' ||
        acc.name.toLowerCase().includes('vajra')
      ) {
        this.accounts.delete(id);
        cleared++;
      }
    }
    for (const [id, auto] of Array.from(this.automations.entries())) {
      if (
        auto.id.startsWith('auto_price_01') ||
        auto.id.startsWith('auto_bangles_02') ||
        auto.name.toLowerCase().includes('bangles') ||
        auto.instagramAccountId === 'ig_acc_01'
      ) {
        this.automations.delete(id);
        cleared++;
      }
    }
    this.logs = this.logs.filter(
      (l) => !l.username?.toLowerCase().includes('priya') && !l.username?.toLowerCase().includes('kiran') && l.instagramAccountId !== 'ig_acc_01'
    );
    this.saveToDisk();

    if (this.ensureClient() && this.supabase) {
      try {
        await this.supabase.from('instagram_accounts').delete().or(`username.ilike.%vajra%,name.ilike.%vajra%`);
        await this.supabase.from('automations').delete().or(`name.ilike.%bangles%`);
      } catch (err) {
        LoggingService.warn('Could not delete demo data in Supabase table:', err);
      }
    }
    return { success: true, clearedCount: cleared };
  }

  // Delete Instagram Account permanently
  async deleteInstagramAccount(userId: string, accountId: string): Promise<boolean> {
    const validUserId = toValidUuid(userId);
    const validAccId = toValidUuid(accountId);

    let found = false;
    for (const [id, acc] of Array.from(this.accounts.entries())) {
      if (id === accountId || id === validAccId || acc.id === accountId || acc.id === validAccId) {
        this.accounts.delete(id);
        found = true;
      }
    }
    this.saveToDisk();

    if (this.ensureClient() && this.supabase) {
      try {
        await this.supabase.from('instagram_accounts').delete().or(`id.eq.${validAccId},id.eq.${accountId}`);
      } catch (e) {
        LoggingService.error('Failed to delete account from Supabase', e);
      }
    }
    return found;
  }

  // Idempotency: Check if comment event was already processed
  async isEventProcessed(eventId: string): Promise<boolean> {
    if (this.ensureClient() && this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('processed_events')
          .select('id')
          .eq('event_id', eventId)
          .maybeSingle();
        if (!error && data) return true;
      } catch (err) {
        LoggingService.warn('Supabase query error in isEventProcessed, checking local store', err);
      }
    }
    return this.processedEvents.has(eventId);
  }

  // Idempotency: Mark comment event as processed
  async markEventProcessed(eventId: string, platform = 'instagram'): Promise<void> {
    this.processedEvents.add(eventId);
    if (this.ensureClient() && this.supabase) {
      try {
        await this.supabase.from('processed_events').insert({
          event_id: eventId,
          platform,
        });
      } catch (err) {
        LoggingService.warn('Supabase insert error in markEventProcessed', err);
      }
    }
  }

  // User queries
  async getUser(id: string): Promise<User | null> {
    if (!id) return null;
    const direct = this.users.get(id) || this.users.get(toValidUuid(id));
    if (direct) return direct;

    const validId = toValidUuid(id);

    if (this.ensureClient() && this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('users')
          .select('*')
          .eq('id', validId)
          .maybeSingle();
        if (data && !error) {
          const user: User = {
            id: data.id,
            email: data.email,
            fullName: data.full_name || data.fullName || data.email.split('@')[0],
            companyName: data.company_name || data.companyName,
            avatarUrl: data.avatar_url || data.avatarUrl,
            password: data.password,
            createdAt: data.created_at || data.createdAt || new Date().toISOString(),
          };
          this.users.set(user.id, user);
          return user;
        }
      } catch (err) {
        LoggingService.warn('Supabase getUser lookup error', err);
      }
    }

    return this.getUserByEmail(id);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    if (!email) return null;
    const cleanEmail = email.toLowerCase().trim();
    for (const user of this.users.values()) {
      if (user.email.toLowerCase().trim() === cleanEmail) {
        return user;
      }
    }

    if (this.ensureClient() && this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('users')
          .select('*')
          .ilike('email', cleanEmail)
          .maybeSingle();
        if (data && !error) {
          const user: User = {
            id: data.id,
            email: data.email,
            fullName: data.full_name || data.fullName || data.email.split('@')[0],
            companyName: data.company_name || data.companyName,
            avatarUrl: data.avatar_url || data.avatarUrl,
            password: data.password,
            createdAt: data.created_at || data.createdAt || new Date().toISOString(),
          };
          this.users.set(user.id, user);
          return user;
        }
      } catch (err) {
        LoggingService.warn('Supabase getUserByEmail lookup error', err);
      }
    }

    return null;
  }

  async saveUser(user: User): Promise<User> {
    const validId = toValidUuid(user.id || user.email);
    const normalizedUser: User = {
      ...user,
      id: validId,
      email: user.email.toLowerCase().trim(),
    };

    this.users.set(normalizedUser.id, normalizedUser);
    if (user.id && user.id !== normalizedUser.id) {
      this.users.set(user.id, normalizedUser);
    }
    this.saveToDisk();

    if (this.ensureClient() && this.supabase) {
      try {
        await this.supabase.from('users').upsert({
          id: normalizedUser.id,
          email: normalizedUser.email,
          full_name: normalizedUser.fullName,
          company_name: normalizedUser.companyName,
          password: normalizedUser.password,
          avatar_url: normalizedUser.avatarUrl,
          created_at: normalizedUser.createdAt || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      } catch (err) {
        LoggingService.warn('Supabase saveUser upsert error', err);
      }
    }

    return normalizedUser;
  }

  // Instagram Accounts
  async getInstagramAccounts(userId: string): Promise<InstagramAccount[]> {
    const validUserId = toValidUuid(userId);
    const loadedAccounts: InstagramAccount[] = [];

    // 1. Authoritative query from Supabase
    if (this.ensureClient() && this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('instagram_accounts')
          .select('*')
          .order('is_connected', { ascending: false });

        if (!error && data && data.length > 0) {
          data.forEach((row: any) => {
            const acc: InstagramAccount = {
              id: row.id,
              userId: row.user_id || validUserId,
              instagramUserId: row.instagram_user_id || `ig_${row.username}`,
              username: row.username,
              name: row.name || row.display_name || row.username,
              profilePictureUrl: row.profile_picture_url,
              accessToken: row.access_token,
              isConnected: row.is_connected ?? true,
              connectedAt: row.connected_at || new Date().toISOString(),
              updatedAt: row.updated_at || new Date().toISOString(),
            };
            this.accounts.set(acc.id, acc);
            loadedAccounts.push(acc);
          });
        }
      } catch (err) {
        LoggingService.warn('Supabase getInstagramAccounts query error', err);
      }
    }

    // 2. Combine with in-memory / disk cache
    const cachedAccounts = Array.from(this.accounts.values());
    for (const acc of cachedAccounts) {
      if (!loadedAccounts.some((a) => a.id === acc.id || a.username.toLowerCase() === acc.username.toLowerCase())) {
        loadedAccounts.push(acc);
      }
    }

    // Filter accounts: prioritize accounts belonging to this specific user first
    const directUserAccounts = loadedAccounts.filter(
      (acc) => acc.userId === validUserId || acc.userId === userId
    );

    if (directUserAccounts.length > 0) {
      return directUserAccounts.sort((a, b) => {
        if (b.isConnected !== a.isConnected) return (b.isConnected ? 1 : 0) - (a.isConnected ? 1 : 0);
        return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
      });
    }

    // Fallback: return active connected accounts in workspace
    const activeAccounts = loadedAccounts.filter((acc) => acc.isConnected);
    if (activeAccounts.length > 0) {
      return activeAccounts.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
    }

    return loadedAccounts;
  }

  async getConnectedInstagramAccount(userId: string): Promise<InstagramAccount | null> {
    const accounts = await this.getInstagramAccounts(userId);
    return accounts.find((acc) => acc.isConnected) || accounts[0] || null;
  }

  async getAccountById(accountId: string): Promise<InstagramAccount | null> {
    const validId = toValidUuid(accountId);
    return this.accounts.get(accountId) || this.accounts.get(validId) || null;
  }

  async saveInstagramAccount(account: InstagramAccount): Promise<InstagramAccount> {
    this.accounts.set(account.id, account);
    this.saveToDisk();
    return account;
  }

  async upsertInstagramAccount(
    userId: string,
    data: {
      username: string;
      name?: string;
      instagramUserId?: string;
      accessToken?: string;
      profilePictureUrl?: string;
    }
  ): Promise<InstagramAccount> {
    const cleanUsername = data.username.replace(/^@/, '').trim();
    const instagramUserId = data.instagramUserId?.trim() || `ig_${cleanUsername.toLowerCase()}`;
    const validUserId = toValidUuid(userId);
    const validAccountId = toValidUuid(`acc_${cleanUsername.toLowerCase()}`);
    const now = new Date().toISOString();

    // Check if account already exists
    let account = Array.from(this.accounts.values()).find(
      (a) =>
        a.username.toLowerCase() === cleanUsername.toLowerCase() ||
        a.id === validAccountId ||
        a.instagramUserId === instagramUserId
    );

    if (account) {
      account.username = cleanUsername;
      account.name = data.name || cleanUsername;
      account.userId = validUserId;
      account.isConnected = true;
      if (data.accessToken) account.accessToken = data.accessToken;
      if (data.profilePictureUrl) account.profilePictureUrl = data.profilePictureUrl;
      account.updatedAt = now;
    } else {
      account = {
        id: validAccountId,
        userId: validUserId,
        instagramUserId,
        username: cleanUsername,
        name: data.name || cleanUsername,
        profilePictureUrl: data.profilePictureUrl,
        accessToken: data.accessToken,
        isConnected: true,
        connectedAt: now,
        updatedAt: now,
      };
    }

    // Set as primary active account and mark others inactive
    for (const [accId, acc] of Array.from(this.accounts.entries())) {
      if (acc.id !== account.id) {
        acc.isConnected = false;
        if (acc.id === 'ig_acc_01' || acc.username.toLowerCase().includes('vajra_demo')) {
          this.accounts.delete(accId);
        }
      }
    }
    this.accounts.set(account.id, account);
    this.saveToDisk();

    // Re-link automations
    for (const auto of this.automations.values()) {
      auto.instagramAccountId = account.id;
    }

    // Save to Supabase with valid UUIDs
    if (this.ensureClient() && this.supabase) {
      try {
        await this.supabase.from('instagram_accounts').upsert({
          id: account.id,
          user_id: validUserId,
          instagram_user_id: account.instagramUserId,
          username: cleanUsername,
          name: account.name,
          display_name: account.name,
          access_token: data.accessToken || account.accessToken || null,
          profile_picture_url: account.profilePictureUrl || null,
          is_connected: true,
          updated_at: now,
        });
      } catch (e) {
        LoggingService.warn('Failed to upsert Instagram account in Supabase (will use local store)', e);
      }
    }

    return account;
  }

  async disconnectInstagramAccount(userId: string, accountId?: string): Promise<boolean> {
    const validUserId = toValidUuid(userId);
    const validAccountId = accountId ? toValidUuid(accountId) : undefined;

    for (const [id, acc] of this.accounts.entries()) {
      if (!accountId || id === accountId || id === validAccountId || acc.id === accountId) {
        acc.isConnected = false;
        acc.updatedAt = new Date().toISOString();
        this.accounts.set(id, acc);
      }
    }
    this.saveToDisk();

    if (this.ensureClient() && this.supabase) {
      try {
        await this.supabase
          .from('instagram_accounts')
          .update({ is_connected: false, updated_at: new Date().toISOString() })
          .or(`user_id.eq.${validUserId}`);
      } catch (_) {}
    }
    return true;
  }

  // Media Cache and Persistent Storage for Instagram Accounts
  setCachedMedia(accountKey: string, media: InstagramMediaItem[]): void {
    const cleanKey = accountKey.toLowerCase().replace(/^@/, '').trim();
    this.cachedMedia.set(cleanKey, media);
    this.saveToDisk();
  }

  async saveInstagramMedia(accountId: string, mediaItems: InstagramMediaItem[]): Promise<void> {
    const account = this.accounts.get(accountId) || Array.from(this.accounts.values()).find(a => a.id === accountId || a.username.toLowerCase() === accountId.toLowerCase());
    const accountKey = account ? account.username : accountId;
    this.setCachedMedia(accountKey, mediaItems);
    if (account) {
      this.setCachedMedia(account.id, mediaItems);
    }

    if (this.ensureClient() && this.supabase && account) {
      try {
        const rows = mediaItems.map((m) => ({
          id: m.id,
          account_id: account.id,
          instagram_user_id: account.instagramUserId,
          username: account.username,
          caption: m.caption || null,
          media_type: m.mediaType,
          media_product_type: m.mediaProductType || 'FEED',
          is_reel: Boolean(m.isReel),
          thumbnail_url: m.thumbnailUrl || null,
          media_url: m.mediaUrl || null,
          permalink: m.permalink || null,
          like_count: m.likeCount || 0,
          comments_count: m.commentsCount || 0,
          timestamp: m.timestamp || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));

        if (rows.length > 0) {
          await this.supabase.from('instagram_media').upsert(rows, { onConflict: 'account_id,id' });
        }
      } catch (err) {
        LoggingService.warn('Could not persist media rows to Supabase (using memory/disk store)', err);
      }
    }
  }

  async getCachedMedia(accountKey: string): Promise<InstagramMediaItem[] | null> {
    const cleanKey = accountKey.toLowerCase().replace(/^@/, '').trim();
    const media = this.cachedMedia.get(cleanKey);
    if (media && media.length > 0) return media;

    // Check by account ID in cache
    const byId = this.cachedMedia.get(accountKey);
    if (byId && byId.length > 0) return byId;

    // Check in Supabase if available
    if (this.ensureClient() && this.supabase) {
      try {
        const account = Array.from(this.accounts.values()).find(
          a => a.username.toLowerCase() === cleanKey || a.id === accountKey
        );
        const filterKey = account ? account.id : accountKey;
        const { data, error } = await this.supabase
          .from('instagram_media')
          .select('*')
          .or(`account_id.eq.${filterKey},username.ilike.${cleanKey}`)
          .order('timestamp', { ascending: false });

        if (!error && data && data.length > 0) {
          const mapped: InstagramMediaItem[] = data.map((d: any) => ({
            id: d.id,
            caption: d.caption,
            mediaType: d.media_type,
            mediaProductType: d.media_product_type,
            isReel: d.is_reel,
            thumbnailUrl: d.thumbnail_url,
            mediaUrl: d.media_url,
            permalink: d.permalink,
            timestamp: d.timestamp,
            likeCount: d.like_count,
            commentsCount: d.comments_count,
          }));
          this.setCachedMedia(cleanKey, mapped);
          return mapped;
        }
      } catch (_) {}
    }

    return null;
  }

  // Automations
  async getAutomations(userId: string): Promise<Automation[]> {
    const validUserId = toValidUuid(userId);
    const loadedAutomations: Automation[] = [];

    // 1. Authoritative query from Supabase
    if (this.ensureClient() && this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('automations')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          data.forEach((d: any) => {
            const auto: Automation = {
              id: d.id,
              userId: d.user_id || validUserId,
              instagramAccountId: d.instagram_account_id,
              name: d.name,
              isActive: d.is_active ?? true,
              triggerType: d.trigger_type || 'comment',
              targetPostType: d.target_post_type || 'all',
              targetPostId: d.target_post_id,
              targetPostUrl: d.target_post_url,
              targetPostThumbnail: d.target_post_thumbnail,
              targetPostCaption: d.target_post_caption,
              matchType: d.match_type || 'contains',
              keywords: Array.isArray(d.keywords) ? d.keywords : ['*'],
              actions: Array.isArray(d.actions) ? d.actions : [],
              stats: d.stats || { commentsMatched: 0, repliesSent: 0, dmsSent: 0 },
              createdAt: d.created_at || new Date().toISOString(),
              updatedAt: d.updated_at || new Date().toISOString(),
            };
            this.automations.set(auto.id, auto);
            loadedAutomations.push(auto);
          });
        }
      } catch (err) {
        LoggingService.warn('Supabase getAutomations error', err);
      }
    }

    // 2. Combine with in-memory / disk cache
    const cached = Array.from(this.automations.values());
    for (const a of cached) {
      if (!loadedAutomations.some((la) => la.id === a.id)) {
        loadedAutomations.push(a);
      }
    }

    return loadedAutomations.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getActiveAutomationsForAccount(accountId: string): Promise<Automation[]> {
    const validAccId = toValidUuid(accountId);
    const automations = await this.getAutomations('all');
    return automations.filter((auto) => {
      if (!auto.isActive) return false;
      if (!auto.instagramAccountId || auto.instagramAccountId === 'all') return true;
      const autoAccId = toValidUuid(auto.instagramAccountId);
      return (
        autoAccId === validAccId ||
        auto.instagramAccountId === accountId ||
        auto.instagramAccountId === validAccId
      );
    });
  }

  async getAutomationById(id: string): Promise<Automation | null> {
    const validId = toValidUuid(id);
    return this.automations.get(id) || this.automations.get(validId) || null;
  }

  async createAutomation(data: Omit<Automation, 'id' | 'createdAt' | 'updatedAt'>): Promise<Automation> {
    const validId = toValidUuid(`auto_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
    const validUserId = toValidUuid(data.userId);
    const validAccountId = toValidUuid(data.instagramAccountId);
    const now = new Date().toISOString();

    const newAutomation: Automation = {
      ...data,
      id: validId,
      userId: validUserId,
      instagramAccountId: validAccountId,
      createdAt: now,
      updatedAt: now,
      stats: {
        commentsMatched: 0,
        repliesSent: 0,
        dmsSent: 0,
      },
    };

    this.automations.set(validId, newAutomation);
    this.saveToDisk();

    if (this.ensureClient() && this.supabase) {
      try {
        await this.supabase.from('automations').insert({
          id: newAutomation.id,
          user_id: validUserId,
          instagram_account_id: validAccountId,
          name: newAutomation.name,
          is_active: newAutomation.isActive,
          trigger_type: newAutomation.triggerType,
          target_post_type: newAutomation.targetPostType,
          target_post_id: newAutomation.targetPostId,
          target_post_url: newAutomation.targetPostUrl,
          target_post_thumbnail: newAutomation.targetPostThumbnail,
          target_post_caption: newAutomation.targetPostCaption,
          match_type: newAutomation.matchType,
          keywords: newAutomation.keywords,
          actions: newAutomation.actions,
          stats: newAutomation.stats,
          created_at: now,
          updated_at: now,
        });

        // Also normalize into automation_triggers and automation_actions
        await this.supabase.from('automation_triggers').insert({
          automation_id: newAutomation.id,
          trigger_source: 'instagram_comment',
          match_type: newAutomation.matchType,
          keywords: newAutomation.keywords,
          target_post_id: newAutomation.targetPostId,
        });
      } catch (err) {
        LoggingService.warn('Supabase insert automation error', err);
      }
    }

    return newAutomation;
  }

  async updateAutomation(
    id: string,
    userId: string,
    data: Partial<Omit<Automation, 'id' | 'userId' | 'createdAt'>>
  ): Promise<Automation | null> {
    const validId = toValidUuid(id);
    const validUserId = toValidUuid(userId);
    const existing = this.automations.get(id) || this.automations.get(validId);
    const now = new Date().toISOString();

    const updated: Automation = existing
      ? {
          ...existing,
          ...data,
          id: validId,
          userId: validUserId,
          updatedAt: now,
        }
      : {
          id: validId,
          userId: validUserId,
          instagramAccountId: data.instagramAccountId ? toValidUuid(data.instagramAccountId) : toValidUuid('ig_acc_primary'),
          name: data.name || 'Auto-DM links from comments',
          isActive: data.isActive !== undefined ? data.isActive : true,
          triggerType: data.triggerType || 'comment',
          targetPostType: data.targetPostType || 'all',
          targetPostId: data.targetPostId,
          targetPostUrl: data.targetPostUrl,
          targetPostThumbnail: data.targetPostThumbnail,
          targetPostCaption: data.targetPostCaption,
          matchType: data.matchType || 'contains',
          keywords: data.keywords || ['*'],
          actions: data.actions || [],
          createdAt: now,
          updatedAt: now,
          stats: {
            commentsMatched: 0,
            repliesSent: 0,
            dmsSent: 0,
          },
        };

    this.automations.set(updated.id, updated);
    this.saveToDisk();

    if (this.ensureClient() && this.supabase) {
      try {
        await this.supabase.from('automations').upsert({
          id: updated.id,
          user_id: validUserId,
          instagram_account_id: toValidUuid(updated.instagramAccountId),
          name: updated.name,
          is_active: updated.isActive,
          trigger_type: updated.triggerType,
          target_post_type: updated.targetPostType,
          target_post_id: updated.targetPostId,
          target_post_url: updated.targetPostUrl,
          target_post_thumbnail: updated.targetPostThumbnail,
          target_post_caption: updated.targetPostCaption,
          match_type: updated.matchType,
          keywords: updated.keywords,
          actions: updated.actions,
          stats: updated.stats,
          updated_at: now,
        });
      } catch (err) {
        LoggingService.warn('Supabase update automation error', err);
      }
    }

    return updated;
  }

  async toggleAutomation(id: string, _userId: string): Promise<Automation | null> {
    const validId = toValidUuid(id);
    let existing = this.automations.get(id) || this.automations.get(validId);
    if (!existing) return null;

    existing.isActive = !existing.isActive;
    existing.updatedAt = new Date().toISOString();
    this.automations.set(existing.id, existing);
    this.saveToDisk();

    if (this.ensureClient() && this.supabase) {
      try {
        await this.supabase
          .from('automations')
          .update({ is_active: existing.isActive, updated_at: existing.updatedAt })
          .eq('id', existing.id);
      } catch (_) {}
    }
    return existing;
  }

  async duplicateAutomation(id: string, userId: string): Promise<Automation | null> {
    const validId = toValidUuid(id);
    const existing = this.automations.get(id) || this.automations.get(validId);
    if (!existing) return null;

    return this.createAutomation({
      userId,
      instagramAccountId: existing.instagramAccountId,
      name: `${existing.name} (Copy)`,
      isActive: existing.isActive,
      triggerType: existing.triggerType,
      targetPostType: existing.targetPostType,
      targetPostId: existing.targetPostId,
      targetPostUrl: existing.targetPostUrl,
      targetPostThumbnail: existing.targetPostThumbnail,
      targetPostCaption: existing.targetPostCaption,
      matchType: existing.matchType,
      keywords: [...existing.keywords],
      actions: JSON.parse(JSON.stringify(existing.actions || [])),
    });
  }

  async deleteAutomation(id: string, _userId: string): Promise<boolean> {
    const validId = toValidUuid(id);
    this.automations.delete(id);
    this.automations.delete(validId);
    this.saveToDisk();

    if (this.ensureClient() && this.supabase) {
      try {
        await this.supabase.from('automations').delete().or(`id.eq.${validId},id.eq.${id}`);
      } catch (_) {}
    }
    return true;
  }

  async incrementAutomationStats(
    id: string,
    type: 'match' | 'reply' | 'dm'
  ): Promise<void> {
    const validId = toValidUuid(id);
    const auto = this.automations.get(id) || this.automations.get(validId);
    if (!auto) return;
    if (!auto.stats) {
      auto.stats = { commentsMatched: 0, repliesSent: 0, dmsSent: 0 };
    }
    if (type === 'match') auto.stats.commentsMatched += 1;
    if (type === 'reply') auto.stats.repliesSent += 1;
    if (type === 'dm') auto.stats.dmsSent += 1;
    auto.lastActivityAt = new Date().toISOString();
    this.automations.set(auto.id, auto);
    this.saveToDisk();
  }

  // Logs & Auditing
  async saveLog(log: Omit<ExecutionLog, 'id' | 'createdAt'>): Promise<ExecutionLog> {
    const id = toValidUuid(`log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
    const fullLog: ExecutionLog = {
      ...log,
      id,
      createdAt: new Date().toISOString(),
    };
    this.logs.unshift(fullLog);
    if (this.logs.length > 500) {
      this.logs.pop();
    }
    this.saveToDisk();

    if (this.ensureClient() && this.supabase) {
      try {
        await this.supabase.from('automation_logs').insert({
          id: fullLog.id,
          user_id: toValidUuid(fullLog.userId),
          automation_id: fullLog.automationId ? toValidUuid(fullLog.automationId) : null,
          instagram_account_id: toValidUuid(fullLog.instagramAccountId),
          username: fullLog.username,
          comment_id: fullLog.commentId,
          comment_text: fullLog.commentText,
          action_type: fullLog.actionType,
          action_status: fullLog.actionStatus,
          error_message: fullLog.errorMessage,
          is_test_event: fullLog.isTestEvent || false,
        });
      } catch (_) {}
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
    const validUserId = toValidUuid(userId);
    let result = this.logs.filter((log) => log.userId === userId || log.userId === validUserId || !log.userId);

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

    const userLogs = await this.getLogs(userId);
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
      commentsProcessed: Math.max(commentsProcessed, 1),
      successfulReplies: Math.max(successfulReplies, 1),
      successfulDMs: Math.max(successfulDMs, 1),
    };
  }
}

export const databaseService = new DatabaseService();

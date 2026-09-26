/**
 * API Client for InstaFlow
 * Connects the React client to server-side REST API routes.
 */

import {
  Automation,
  ExecutionLog,
  DashboardStats,
  InstagramAccount,
  InstagramMediaItem,
  User,
  MetaConfigStatus,
} from '../../shared/types';

const API_BASE = ((import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || '') + '/api';

export class ApiClient {
  static getAuthToken(): string | null {
    return localStorage.getItem('instaflow_auth_token');
  }

  static setAuthToken(token: string | null): void {
    if (token) {
      localStorage.setItem('instaflow_auth_token', token);
    } else {
      localStorage.removeItem('instaflow_auth_token');
      localStorage.removeItem('instaflow_auth_user');
    }
  }

  private static async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const token = ApiClient.getAuthToken();
    let userEmail: string | undefined;
    try {
      const stored = localStorage.getItem('instaflow_auth_user');
      if (stored) {
        userEmail = JSON.parse(stored)?.email;
      }
    } catch {}

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}`, 'x-user-id': token } : {}),
      ...(userEmail ? { 'x-user-email': userEmail } : {}),
      ...(options?.headers as Record<string, string>),
    };

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      let errorMessage = errorBody.error || errorBody.message;
      if (!errorMessage) {
        if (res.status === 404) {
          errorMessage = `Backend route ${endpoint} returned 404. If running on Vercel, ensure the latest commit with api/ functions and vercel.json is deployed.`;
        } else if (res.status === 500) {
          errorMessage = `Backend server encountered an error processing ${endpoint} (HTTP 500).`;
        } else {
          errorMessage = `Request to ${endpoint} failed with status ${res.status}`;
        }
      }
      throw new Error(errorMessage);
    }

    return res.json();
  }

  // Dashboard Stats
  static async getDashboardStats(): Promise<{ stats: DashboardStats; recentActivity: ExecutionLog[] }> {
    return this.request('/dashboard/stats');
  }

  // Automations
  static async getAutomations(): Promise<{ automations: Automation[] }> {
    return this.request('/automations');
  }

  static async getAutomation(id: string): Promise<{ automation: Automation }> {
    return this.request(`/automations/${id}`);
  }

  static async createAutomation(data: Partial<Automation>): Promise<{ automation: Automation }> {
    return this.request('/automations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async updateAutomation(id: string, data: Partial<Automation>): Promise<{ automation: Automation }> {
    return this.request(`/automations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static async toggleAutomation(id: string): Promise<{ automation: Automation }> {
    return this.request(`/automations/${id}/toggle`, {
      method: 'POST',
    });
  }

  static async duplicateAutomation(id: string): Promise<{ automation: Automation }> {
    return this.request(`/automations/${id}/duplicate`, {
      method: 'POST',
    });
  }

  static async deleteAutomation(id: string): Promise<{ success: boolean }> {
    return this.request(`/automations/${id}`, {
      method: 'DELETE',
    });
  }

  // Comments and Logs
  static async getComments(params?: { status?: string; search?: string }): Promise<{ comments: ExecutionLog[] }> {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'all') query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return this.request(`/comments${queryString}`);
  }

  static async getLogs(): Promise<{ logs: ExecutionLog[] }> {
    return this.request('/logs');
  }

  // Instagram Accounts
  static async getInstagramAccounts(): Promise<{ accounts: InstagramAccount[] }> {
    return this.request('/instagram/accounts');
  }

  // Fetch Live Instagram Reels & Media
  static async getInstagramMedia(accountId?: string): Promise<{
    success: boolean;
    media: InstagramMediaItem[];
    hasAccount: boolean;
    hasToken: boolean;
    account?: InstagramAccount;
    error?: string;
    message?: string;
  }> {
    try {
      const query = accountId ? `?accountId=${encodeURIComponent(accountId)}` : '';
      return await this.request(`/instagram/media${query}`);
    } catch (err: any) {
      return {
        success: false,
        media: [],
        hasAccount: false,
        hasToken: false,
        message: err?.message || 'Media not available',
      };
    }
  }

  // Clear demo accounts and sample data
  static async clearDemoAccounts(): Promise<{ success: boolean; clearedCount: number; message: string }> {
    return this.request('/instagram/clear-demo', {
      method: 'POST',
    });
  }

  static async deleteInstagramAccount(accountId: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/instagram/accounts/${accountId}`, {
      method: 'DELETE',
    });
  }

  static async getMetaConfigStatus(): Promise<{ config: MetaConfigStatus }> {
    return this.request('/instagram/config-status');
  }

  static async getInstagramIntegrationStatus(): Promise<{
    isConfigured: boolean;
    isValid: boolean;
    tokenType?: string;
    expiresAt?: string;
    scopes?: string[];
    accountId?: string;
    username?: string;
    name?: string;
    profilePictureUrl?: string;
    followersCount?: number;
    mediaCount?: number;
    accountType?: string;
    error?: string;
    message?: string;
  }> {
    return this.request('/instagram/integration-status');
  }

  static async saveMetaConfig(data: {
    appId?: string;
    appSecret?: string;
    verifyToken?: string;
    redirectUri?: string;
    webhookCallbackUrl?: string;
  }): Promise<{ success: boolean; message: string; config: MetaConfigStatus }> {
    return this.request('/instagram/config', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async disconnectInstagram(accountId?: string): Promise<{ success: boolean }> {
    try {
      return await this.request('/instagram/disconnect', {
        method: 'POST',
        body: JSON.stringify({ accountId }),
      });
    } catch {
      return await this.request('/disconnect', {
        method: 'POST',
        body: JSON.stringify({ accountId }),
      });
    }
  }

  static async connectInstagramDirect(username: string, name?: string): Promise<{ success: boolean; account: InstagramAccount; message: string }> {
    return this.connectInstagramAccount({ username, name });
  }

  static async connectInstagramAccount(data: {
    username: string;
    name?: string;
    instagramUserId?: string;
    accessToken?: string;
    appId?: string;
    appSecret?: string;
  }): Promise<{ success: boolean; account: InstagramAccount; message: string; media?: InstagramMediaItem[] }> {
    try {
      return await this.request('/instagram/connect-account', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (err: any) {
      console.warn('Primary connect route attempt failed, trying fallback endpoints:', err?.message);
      try {
        return await this.request('/connect-account', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      } catch (err2: any) {
        try {
          return await this.request('/instagram/connect', {
            method: 'POST',
            body: JSON.stringify(data),
          });
        } catch {
          throw err2 || err;
        }
      }
    }
  }

  static async testMetaToken(data: {
    accessToken: string;
    appId?: string;
    appSecret?: string;
    username?: string;
    instagramUserId?: string;
  }): Promise<{
    success: boolean;
    isValid: boolean;
    type?: string;
    appId?: string;
    userId?: string;
    scopes: string[];
    expiresAt?: string;
    account?: any;
    mediaCount: number;
    media: InstagramMediaItem[];
    error?: string;
    diagnostics: string[];
  }> {
    return this.request('/instagram/test-token', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async connectInstagramWithToken(data: {
    accessToken: string;
    instagramUserId?: string;
    username?: string;
    appId?: string;
    appSecret?: string;
  }): Promise<{
    success: boolean;
    account: InstagramAccount;
    media?: InstagramMediaItem[];
    mediaCount: number;
    message: string;
    metaError?: string;
  }> {
    return this.request('/instagram/connect-token', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async importInstagramReel(data: {
    reelUrl: string;
    caption?: string;
  }): Promise<{
    success: boolean;
    message: string;
    reel: InstagramMediaItem;
    totalMedia: number;
    media: InstagramMediaItem[];
  }> {
    return this.request('/instagram/import-reel', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async addCustomReel(data: {
    reelUrl?: string;
    caption?: string;
    thumbnailUrl?: string;
    mediaUrl?: string;
  }): Promise<{
    success: boolean;
    message: string;
    reel: InstagramMediaItem;
    totalMedia: number;
  }> {
    return this.request('/instagram/custom-media', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async syncComments(): Promise<{ success: boolean; message: string; result?: any }> {
    try {
      return await this.request('/instagram/sync-comments', {
        method: 'POST',
      });
    } catch (e: any) {
      return { success: false, message: e?.message || 'Failed to sync' };
    }
  }

  static async switchInstagramAccount(accountId: string): Promise<{ success: boolean; account: InstagramAccount; message: string }> {
    try {
      return await this.request('/instagram/switch-account', {
        method: 'POST',
        body: JSON.stringify({ accountId }),
      });
    } catch {
      return await this.request('/switch-account', {
        method: 'POST',
        body: JSON.stringify({ accountId }),
      });
    }
  }

  // Database status
  static async getDatabaseStatus(): Promise<{
    success: boolean;
    provider: 'supabase' | 'local_memory';
    isUsingSupabase: boolean;
    projectId?: string | null;
    supabaseUrl?: string;
    envConfig: {
      supabaseUrlConfigured: boolean;
      supabaseKeyConfigured: boolean;
    };
    tablesVerified: boolean;
    errorDetail?: string | null;
    message: string;
  }> {
    return this.request('/database/status');
  }

  static async saveDatabaseConfig(payload: {
    supabaseUrl: string;
    supabaseKey: string;
  }): Promise<{ success: boolean; message: string; tablesVerified?: boolean; error?: string }> {
    return this.request('/database/config', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  static async runDatabaseMigration(payload: {
    password?: string;
    accessToken?: string;
  }): Promise<{ success: boolean; message: string; error?: string }> {
    return this.request('/database/migrate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Test Mode
  static async sendTestComment(data: {
    username: string;
    commentText: string;
    automationId?: string;
    postId?: string;
  }): Promise<{
    success: boolean;
    mode: string;
    message: string;
    result: {
      commentId: string;
      matchedAutomations: number;
      actionsExecuted: number;
      logs: ExecutionLog[];
    };
  }> {
    return this.request('/test/comment', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Webhook Diagnostics
  static async testWebhookVerify(verifyToken?: string): Promise<{
    success: boolean;
    simulatedChallenge: string;
    responseReceived: string | null;
    error: string | null;
    testedToken: string;
    configuredToken: string;
    message: string;
  }> {
    return this.request('/webhooks/test-verify', {
      method: 'POST',
      body: JSON.stringify({ verifyToken }),
    });
  }

  // Auth
  static async getCurrentUser(): Promise<{ user: User | null; isAuthenticated: boolean }> {
    const token = ApiClient.getAuthToken();
    if (!token) {
      return { user: null, isAuthenticated: false };
    }
    try {
      return await this.request('/auth/me');
    } catch {
      return { user: null, isAuthenticated: false };
    }
  }

  static async signUp(data: {
    email: string;
    password: string;
    fullName?: string;
    companyName?: string;
  }): Promise<{ success: boolean; user: User; token: string; message: string }> {
    const res = await this.request<{ success: boolean; user: User; token: string; message: string }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.token) {
      this.setAuthToken(res.token);
      localStorage.setItem('instaflow_auth_user', JSON.stringify(res.user));
    }
    return res;
  }

  static async signIn(data: {
    email: string;
    password: string;
  }): Promise<{ success: boolean; user: User; token: string; message: string }> {
    const res = await this.request<{ success: boolean; user: User; token: string; message: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.token) {
      this.setAuthToken(res.token);
      localStorage.setItem('instaflow_auth_user', JSON.stringify(res.user));
    }
    return res;
  }

  static async signOut(): Promise<{ success: boolean }> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } catch {}
    this.setAuthToken(null);
    return { success: true };
  }
}

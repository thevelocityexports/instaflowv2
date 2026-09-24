/**
 * API Client for InstaFlow
 * Connects the React client to server-side REST API routes.
 */

import {
  Automation,
  ExecutionLog,
  DashboardStats,
  InstagramAccount,
  User,
  MetaConfigStatus,
} from '../../shared/types';

const API_BASE = '/api';

export class ApiClient {
  private static async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      throw new Error(errorBody.error || errorBody.message || `Request failed with status ${res.status}`);
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

  static async getMetaConfigStatus(): Promise<{ config: MetaConfigStatus }> {
    return this.request('/instagram/config-status');
  }

  static async disconnectInstagram(accountId?: string): Promise<{ success: boolean }> {
    return this.request('/instagram/disconnect', {
      method: 'POST',
      body: JSON.stringify({ accountId }),
    });
  }

  // Database status
  static async getDatabaseStatus(): Promise<{
    success: boolean;
    provider: 'supabase' | 'local_memory';
    isUsingSupabase: boolean;
    projectId?: string | null;
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

  // Auth
  static async getCurrentUser(): Promise<{ user: User }> {
    return this.request('/auth/me');
  }
}

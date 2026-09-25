/**
 * Workspace Service
 * Manages SaaS customer workspaces, tenant isolation, and member roles.
 */

import { toValidUuid } from '../utils/uuid';
import { databaseService } from './databaseService';
import { LoggingService } from './loggingService';

export interface Workspace {
  id: string;
  ownerUserId: string;
  name: string;
  slug: string;
  status: 'active' | 'inactive' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  status: 'active' | 'invited' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

export class WorkspaceService {
  private static workspaces: Map<string, Workspace> = new Map();
  private static members: Map<string, WorkspaceMember[]> = new Map();

  /**
   * Resolves or auto-creates a default workspace for a user.
   */
  static async getOrCreateDefaultWorkspace(userId: string, userName?: string, companyName?: string): Promise<Workspace> {
    const validUserId = toValidUuid(userId);
    const workspaceId = toValidUuid(`ws_${validUserId}`);

    // Check memory cache
    const existing = this.workspaces.get(workspaceId);
    if (existing) return existing;

    const name = companyName || (userName ? `${userName}'s Workspace` : 'Primary Workspace');
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 30);
    const now = new Date().toISOString();

    const ws: Workspace = {
      id: workspaceId,
      ownerUserId: validUserId,
      name,
      slug,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };

    this.workspaces.set(ws.id, ws);

    // Persist to Supabase if connected
    const supabase = databaseService.getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('workspaces').upsert({
          id: ws.id,
          owner_user_id: ws.ownerUserId,
          name: ws.name,
          slug: ws.slug,
          status: ws.status,
          updated_at: now,
        });

        await supabase.from('workspace_members').upsert({
          workspace_id: ws.id,
          user_id: validUserId,
          role: 'OWNER',
          status: 'active',
          updated_at: now,
        });
      } catch (err) {
        LoggingService.warn('Could not upsert workspace to Supabase (using memory cache):', err);
      }
    }

    return ws;
  }

  static async getWorkspace(workspaceId: string): Promise<Workspace | null> {
    const validId = toValidUuid(workspaceId);
    if (this.workspaces.has(validId)) return this.workspaces.get(validId)!;

    const supabase = databaseService.getSupabaseClient();
    if (supabase) {
      try {
        const { data } = await supabase.from('workspaces').select('*').eq('id', validId).maybeSingle();
        if (data) {
          const ws: Workspace = {
            id: data.id,
            ownerUserId: data.owner_user_id,
            name: data.name,
            slug: data.slug,
            status: data.status,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          };
          this.workspaces.set(ws.id, ws);
          return ws;
        }
      } catch (_) {}
    }
    return null;
  }
}

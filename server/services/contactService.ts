/**
 * Contact Service
 * Tracks Instagram commenters and DM recipients into isolated Workspace contacts.
 */

import { toValidUuid } from '../utils/uuid';
import { databaseService } from './databaseService';
import { LoggingService } from './loggingService';

export interface InstagramContact {
  id: string;
  workspaceId: string;
  instagramAccountId: string;
  instagramUserId: string;
  username: string;
  firstName?: string;
  lastName?: string;
  profilePictureUrl?: string;
  status: 'active' | 'archived';
  firstInteractionAt: string;
  lastInteractionAt: string;
  metadata?: Record<string, any>;
}

export class ContactService {
  private static contacts: Map<string, InstagramContact> = new Map();

  /**
   * Upserts a contact when an Instagram user interacts (comments or DMs).
   */
  static async recordInteraction(params: {
    workspaceId: string;
    instagramAccountId: string;
    instagramUserId: string;
    username: string;
  }): Promise<InstagramContact> {
    const cleanUsername = params.username.replace(/^@/, '').trim();
    const contactKey = `${params.instagramAccountId}_${cleanUsername.toLowerCase()}`;
    const contactId = toValidUuid(contactKey);
    const now = new Date().toISOString();

    let contact = this.contacts.get(contactId);
    if (contact) {
      contact.lastInteractionAt = now;
      contact.username = cleanUsername;
    } else {
      contact = {
        id: contactId,
        workspaceId: params.workspaceId,
        instagramAccountId: params.instagramAccountId,
        instagramUserId: params.instagramUserId || `ig_${cleanUsername.toLowerCase()}`,
        username: cleanUsername,
        status: 'active',
        firstInteractionAt: now,
        lastInteractionAt: now,
      };
    }

    this.contacts.set(contactId, contact);

    const supabase = databaseService.getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('instagram_contacts').upsert({
          id: contact.id,
          workspace_id: contact.workspaceId,
          instagram_account_id: contact.instagramAccountId,
          instagram_user_id: contact.instagramUserId,
          username: contact.username,
          status: contact.status,
          first_interaction_at: contact.firstInteractionAt,
          last_interaction_at: contact.lastInteractionAt,
        });
      } catch (err) {
        LoggingService.warn('Could not upsert contact in Supabase (using memory cache):', err);
      }
    }

    return contact;
  }

  static async getContactsByWorkspace(workspaceId: string): Promise<InstagramContact[]> {
    return Array.from(this.contacts.values()).filter((c) => c.workspaceId === workspaceId);
  }
}

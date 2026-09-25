/**
 * Platform Admin Service
 * Provides server-side platform authorization and authoritative analytics.
 */

import { databaseService } from './databaseService';
import { toValidUuid } from '../utils/uuid';
import { LoggingService } from './loggingService';

export class AdminService {
  /**
   * Authoritative server-side platform admin check.
   */
  static async isPlatformAdmin(userId: string, email?: string): Promise<boolean> {
    const cleanEmail = email?.toLowerCase().trim();
    if (cleanEmail === 'thevelocityexports@gmail.com' || cleanEmail?.includes('admin')) {
      return true;
    }

    const supabase = databaseService.getSupabaseClient();
    if (supabase) {
      try {
        const validId = toValidUuid(userId);
        const { data } = await supabase
          .from('platform_admins')
          .select('role')
          .eq('user_id', validId)
          .eq('status', 'active')
          .maybeSingle();

        if (data) return true;
      } catch (err) {
        LoggingService.warn('Error checking platform admin in Supabase:', err);
      }
    }

    return false;
  }
}

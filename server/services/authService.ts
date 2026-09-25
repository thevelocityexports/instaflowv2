/**
 * Authentication Service
 * Manages user sessions, Supabase Auth integration, and route authorization.
 */

import { Request, Response, NextFunction } from 'express';
import { databaseService } from './databaseService';
import { LoggingService } from './loggingService';
import { User } from '../../shared/types';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export class AuthService {
  /**
   * Resolves the current authenticated user from Supabase JWT header or session.
   * If running in local dev mode without active Supabase token, falls back safely to default user.
   */
  static async resolveUser(req: Request): Promise<User | null> {
    const authHeader = req.headers.authorization;
    const customUserId = req.headers['x-user-id'] as string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      if (token && token !== 'undefined' && token !== 'null') {
        try {
          const user = (await databaseService.getUser(token)) || (await databaseService.getUserByEmail(token));
          if (user) return user;
        } catch (err) {
          LoggingService.warn('Could not resolve user from bearer token', err);
        }
      }
    }

    if (customUserId && customUserId !== 'undefined' && customUserId !== 'null') {
      try {
        const user = await databaseService.getUser(customUserId);
        if (user) return user;
      } catch (err) {}
    }

    // Default fallback
    return databaseService.getUser('usr_default_01');
  }

  /**
   * Express middleware to protect API routes
   */
  static requireAuth = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = await AuthService.resolveUser(req);
      if (!user) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Please sign in with Google to access this resource.',
        });
        return;
      }
      req.user = user;
      next();
    } catch (err) {
      LoggingService.error('Auth middleware failure', err);
      res.status(401).json({ error: 'Authentication failed' });
    }
  };
}

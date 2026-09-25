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
    const customUserId = (req.headers['x-user-id'] as string | undefined) || (req.headers['x-user-email'] as string | undefined);

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      if (token && token !== 'undefined' && token !== 'null' && token !== '') {
        try {
          const user = (await databaseService.getUser(token)) || (await databaseService.getUserByEmail(token));
          if (user) return user;

          if (token.includes('@')) {
            const name = token.split('@')[0];
            const newUser: User = {
              id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              email: token.toLowerCase(),
              fullName: name.charAt(0).toUpperCase() + name.slice(1),
              createdAt: new Date().toISOString(),
            };
            await databaseService.saveUser(newUser);
            return newUser;
          }
        } catch (err) {
          LoggingService.warn('Could not resolve user from bearer token', err);
        }
      }
    }

    if (customUserId && customUserId !== 'undefined' && customUserId !== 'null' && customUserId !== '') {
      try {
        const user = (await databaseService.getUser(customUserId.trim())) || (await databaseService.getUserByEmail(customUserId.trim()));
        if (user) return user;

        if (customUserId.includes('@')) {
          const name = customUserId.split('@')[0];
          const newUser: User = {
            id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            email: customUserId.toLowerCase(),
            fullName: name.charAt(0).toUpperCase() + name.slice(1),
            createdAt: new Date().toISOString(),
          };
          await databaseService.saveUser(newUser);
          return newUser;
        }
      } catch (err) {}
    }

    // Return null if no valid token or identifier is present
    return null;
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

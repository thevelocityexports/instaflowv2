import { Router, Request, Response } from 'express';
import { databaseService } from '../services/databaseService';
import { AuthService } from '../services/authService';

const router = Router();

/**
 * GET /api/auth/me
 */
router.get('/me', async (req: Request, res: Response): Promise<void> => {
  const user = await AuthService.resolveUser(req);
  if (!user) {
    res.status(401).json({ user: null });
    return;
  }
  res.json({ user });
});

/**
 * POST /api/auth/google
 * Provides Google OAuth instructions or initializes Supabase Auth flow
 */
router.post('/google', async (req: Request, res: Response): Promise<void> => {
  // If real Supabase configured:
  const supabaseUrl = process.env.SUPABASE_URL;
  if (supabaseUrl && !supabaseUrl.includes('MY_SUPABASE')) {
    res.json({
      useSupabaseAuth: true,
      supabaseUrl,
    });
    return;
  }

  // Seamless dev login fallback
  const user = await databaseService.getUser('usr_default_01');
  res.json({
    useSupabaseAuth: false,
    user,
    token: 'usr_default_01',
    message: 'Signed in successfully with Google (Development Session)',
  });
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', (_req: Request, res: Response): void => {
  res.json({ success: true, message: 'Logged out successfully' });
});

export default router;

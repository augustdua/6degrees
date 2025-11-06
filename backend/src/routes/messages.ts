import express, { Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import jwt from 'jsonwebtoken';
import { getConversations } from '../controllers/messagesController';
import { AuthenticatedRequest } from '../types';

const router = express.Router();

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET!;

/**
 * Dual authentication middleware
 * Tries JWT auth first, falls back to Telegram auth if JWT fails
 */
const authenticateDual = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token) {
    res.status(401).json({
      error: 'Unauthorized',
      reason: 'Missing bearer token'
    });
    return;
  }

  try {
    // Try JWT verification first (for main app)
    try {
      const decoded = jwt.verify(token, SUPABASE_JWT_SECRET) as any;
      
      // Get user from database using Supabase user ID
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, profile_picture_url, bio, linkedin_url, twitter_url, is_verified, created_at, updated_at')
        .eq('id', decoded.sub)
        .single();

      if (!userError && user) {
        req.user = user as any;
        next();
        return;
      }
    } catch (jwtError) {
      // JWT verification failed, try Telegram auth
      console.log('JWT auth failed, trying Telegram auth...');
    }

    // Try Telegram auth token (for mini app)
    const { data: tokenData, error: tokenError } = await supabase
      .from('telegram_auth_tokens')
      .select('user_id, expires_at')
      .eq('token', token)
      .single();

    if (tokenError || !tokenData) {
      console.error('Both auth methods failed');
      res.status(401).json({
        error: 'Unauthorized',
        reason: 'Invalid auth token'
      });
      return;
    }

    // Check if token is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      console.error('Telegram auth token expired');
      await supabase
        .from('telegram_auth_tokens')
        .delete()
        .eq('token', token);

      res.status(401).json({
        error: 'Unauthorized',
        reason: 'Token expired'
      });
      return;
    }

    // Get user from database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, profile_picture_url, bio, linkedin_url, twitter_url, is_verified, created_at, updated_at')
      .eq('id', tokenData.user_id)
      .single();

    if (userError || !user) {
      console.error('Telegram auth - user not found:', userError?.message);
      res.status(401).json({
        error: 'Unauthorized',
        reason: 'User not found'
      });
      return;
    }

    console.log('✅ Telegram auth succeeded for user:', user.email);
    req.user = user as any;
    next();

  } catch (error: any) {
    console.error('Auth error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      reason: 'Failed to authenticate'
    });
  }
};

// All routes require authentication (JWT or Telegram)
router.use(authenticateDual);

// Get conversations
router.get('/conversations', getConversations);

export default router;



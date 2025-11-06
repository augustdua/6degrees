import { Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import { AuthenticatedRequest } from '../types';

/**
 * Middleware to authenticate requests from Telegram Mini App
 * Validates custom Telegram auth tokens stored in telegram_auth_tokens table
 */
export const authenticateTelegram = async (
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
    // Find and verify token in telegram_auth_tokens table
    const { data: tokenData, error: tokenError } = await supabase
      .from('telegram_auth_tokens')
      .select('user_id, expires_at')
      .eq('token', token)
      .single();

    if (tokenError || !tokenData) {
      console.error('Telegram auth token not found:', tokenError?.message);
      res.status(401).json({
        error: 'Unauthorized',
        reason: 'Invalid auth token'
      });
      return;
    }

    // Check if token is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      console.error('Telegram auth token expired');
      // Delete expired token
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

    // Attach user to request
    req.user = user as any;
    next();

  } catch (error: any) {
    console.error('Telegram auth error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      reason: 'Failed to authenticate'
    });
  }
};


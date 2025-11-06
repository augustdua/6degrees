import { Request, Response } from 'express';
import crypto from 'crypto';
import { supabase } from '../config/supabase';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

/**
 * Verify Telegram WebApp initData
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
function verifyTelegramWebAppData(initData: string): boolean {
  if (!BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN not set');
    return false;
  }

  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    urlParams.delete('hash');

    if (!hash) return false;

    // Create data-check-string
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // Generate secret key
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(BOT_TOKEN)
      .digest();

    // Generate hash
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    return calculatedHash === hash;
  } catch (error) {
    console.error('Error verifying Telegram data:', error);
    return false;
  }
}

/**
 * Authenticate user from Telegram Mini App
 * POST /api/telegram/auth
 */
export async function authenticateFromTelegram(req: Request, res: Response) {
  try {
    const { initData } = req.body;

    if (!initData) {
      return res.status(400).json({ error: 'Missing initData' });
    }

    // Verify the data is authentic
    const isValid = verifyTelegramWebAppData(initData);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid Telegram data' });
    }

    // Parse user data
    const urlParams = new URLSearchParams(initData);
    const userParam = urlParams.get('user');
    
    if (!userParam) {
      return res.status(400).json({ error: 'User data not found' });
    }

    const telegramUser = JSON.parse(userParam);
    const telegramChatId = telegramUser.id.toString();

    // Find user by telegram_chat_id
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name')
      .eq('telegram_chat_id', telegramChatId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ 
        error: 'Account not linked',
        message: 'Please link your Telegram account first in the 6Degree app'
      });
    }

    // Generate a temporary auth token (valid for 1 hour)
    const authToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store the auth token in the database
    const { error: tokenError } = await supabase
      .from('telegram_auth_tokens')
      .insert({
        user_id: user.id,
        token: authToken,
        expires_at: expiresAt.toISOString()
      });

    if (tokenError) {
      console.error('Error storing auth token:', tokenError);
      return res.status(500).json({ error: 'Failed to create auth token' });
    }

    // Return user data and auth token
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name
      },
      authToken
    });

  } catch (error: any) {
    console.error('Error authenticating from Telegram:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Verify auth token from Telegram Mini App
 * GET /api/telegram/verify-token
 */
export async function verifyAuthToken(req: Request, res: Response) {
  try {
    const authToken = req.headers.authorization?.replace('Bearer ', '');

    if (!authToken) {
      return res.status(401).json({ error: 'Missing auth token' });
    }

    // Find and verify token
    const { data: tokenData, error: tokenError } = await supabase
      .from('telegram_auth_tokens')
      .select('user_id, expires_at')
      .eq('token', authToken)
      .single();

    if (tokenError || !tokenData) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Check if expired
    if (new Date(tokenData.expires_at) < new Date()) {
      // Delete expired token
      await supabase
        .from('telegram_auth_tokens')
        .delete()
        .eq('token', authToken);

      return res.status(401).json({ error: 'Token expired' });
    }

    // Get user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name')
      .eq('id', tokenData.user_id)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user
    });

  } catch (error: any) {
    console.error('Error verifying auth token:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}


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

    if (calculatedHash !== hash) {
      console.error('Hash mismatch:', { calculated: calculatedHash, received: hash });
      return false;
    }

    // Check auth_date freshness (10 minutes)
    const authDate = parseInt(urlParams.get('auth_date') || '0');
    const now = Math.floor(Date.now() / 1000);
    const age = Math.abs(now - authDate);
    
    if (age > 10 * 60) {
      console.error(`Auth data too old: ${age} seconds`);
      return false;
    }

    return true;
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

    console.log('🔐 Telegram auth request received');

    if (!initData) {
      console.error('❌ Missing initData');
      return res.status(400).json({ error: 'Missing initData' });
    }

    // Verify the data is authentic
    console.log('🔍 Verifying initData...');
    const isValid = verifyTelegramWebAppData(initData);
    if (!isValid) {
      console.error('❌ Invalid Telegram data');
      return res.status(401).json({ error: 'Invalid Telegram data' });
    }
    
    console.log('✅ initData verified successfully');

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
    return res.json({
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
    return res.status(500).json({ error: 'Internal server error' });
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

    return res.json({
      success: true,
      user
    });

  } catch (error: any) {
    console.error('Error verifying auth token:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Exchange Telegram token for Supabase session
 * POST /api/telegram/webapp/exchange-session
 */
export async function exchangeTokenForSession(req: Request, res: Response) {
  try {
    const { telegramToken } = req.body;

    console.log('🔄 Token exchange request received');

    if (!telegramToken) {
      return res.status(400).json({ error: 'Telegram token is required' });
    }

    // Verify the Telegram token
    const { data: tokenData, error: tokenError } = await supabase
      .from('telegram_auth_tokens')
      .select('user_id, expires_at')
      .eq('token', telegramToken)
      .single();

    if (tokenError || !tokenData) {
      console.error('❌ Invalid token:', tokenError);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Check if token is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      console.error('❌ Token expired');
      await supabase
        .from('telegram_auth_tokens')
        .delete()
        .eq('token', telegramToken);
      
      return res.status(401).json({ error: 'Token expired' });
    }

    // Get user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', tokenData.user_id)
      .single();

    if (userError || !user) {
      console.error('❌ User not found:', userError);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('✅ Generating session for user:', user.email);

    // Generate a magic link for the existing user (works for both new and existing users)
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: user.email
    });

    if (linkError || !linkData) {
      console.error('❌ Failed to generate magic link:', linkError);
      return res.status(500).json({ error: 'Failed to create session' });
    }

    console.log('🔗 Magic link generated:', linkData.properties.action_link);

    // Extract access and refresh tokens from the magic link URL
    const url = new URL(linkData.properties.action_link);
    const accessToken = url.searchParams.get('access_token');
    const refreshToken = url.searchParams.get('refresh_token');

    console.log('🔍 Extracted tokens:', { 
      hasAccessToken: !!accessToken, 
      hasRefreshToken: !!refreshToken,
      urlParams: Array.from(url.searchParams.keys())
    });

    if (!accessToken) {
      console.error('❌ No access token in magic link URL');
      return res.status(500).json({ error: 'Failed to generate session tokens' });
    }

    console.log('✅ Session tokens generated successfully');
    return res.json({
      success: true,
      access_token: accessToken,
      refresh_token: refreshToken || '',
      email: user.email
    });

  } catch (error: any) {
    console.error('❌ Error exchanging token:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


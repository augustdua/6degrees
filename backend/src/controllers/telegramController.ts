import { Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { queueTelegramNotification } from '../services/telegramService';

// Complete Telegram account linking with token
export async function linkTelegramAccount(req: Request, res: Response) {
  try {
    const { token } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Verify token
    const { data: linkData, error: linkError } = await supabase
      .from('telegram_link_tokens')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .single();

    if (linkError || !linkData) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    // Check if token is expired
    if (new Date(linkData.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Token has expired. Please generate a new one.' });
    }

    // Get user's email to verify it matches
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .single();

    if (userError || !user || user.email !== linkData.email) {
      return res.status(403).json({ error: 'Email mismatch. Please use the correct account.' });
    }

    // Update user with Telegram info
    const { error: updateError } = await supabase
      .from('users')
      .update({
        telegram_chat_id: linkData.telegram_chat_id,
        telegram_username: linkData.telegram_username,
        telegram_first_name: linkData.telegram_first_name,
        telegram_notifications_enabled: true,
        telegram_linked_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error linking Telegram account:', updateError);
      return res.status(500).json({ error: 'Failed to link account' });
    }

    // Mark token as used
    await supabase
      .from('telegram_link_tokens')
      .update({ used: true })
      .eq('token', token);

    // Send welcome notification to Telegram
    await queueTelegramNotification(
      linkData.telegram_chat_id,
      'approval',
      {
        type: 'Account Linked',
        approver_name: '6Degree',
        item_name: 'Your Telegram account',
        details: 'You\'ll now receive instant notifications for messages, connections, and more!'
      }
    );

    res.json({ 
      success: true, 
      message: 'Telegram account linked successfully',
      telegram_username: linkData.telegram_username
    });
  } catch (error) {
    console.error('Error linking Telegram:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Unlink Telegram account
export async function unlinkTelegramAccount(req: Request, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get chat ID before unlinking for goodbye message
    const { data: userData } = await supabase
      .from('users')
      .select('telegram_chat_id')
      .eq('id', userId)
      .single();

    // Update user to remove Telegram info
    const { error } = await supabase
      .from('users')
      .update({
        telegram_chat_id: null,
        telegram_username: null,
        telegram_first_name: null,
        telegram_notifications_enabled: false
      })
      .eq('id', userId);

    if (error) {
      console.error('Error unlinking Telegram account:', error);
      return res.status(500).json({ error: 'Failed to unlink account' });
    }

    res.json({ success: true, message: 'Telegram account unlinked successfully' });
  } catch (error) {
    console.error('Error unlinking Telegram:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Get Telegram connection status
export async function getTelegramStatus(req: Request, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('telegram_chat_id, telegram_username, telegram_first_name, telegram_notifications_enabled, telegram_linked_at')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching Telegram status:', error);
      return res.status(500).json({ error: 'Failed to fetch status' });
    }

    res.json({
      is_linked: !!user.telegram_chat_id,
      telegram_username: user.telegram_username,
      telegram_first_name: user.telegram_first_name,
      notifications_enabled: user.telegram_notifications_enabled || false,
      linked_at: user.telegram_linked_at
    });
  } catch (error) {
    console.error('Error getting Telegram status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Toggle Telegram notifications
export async function toggleTelegramNotifications(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { enabled } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled must be a boolean' });
    }

    // Check if Telegram is linked
    const { data: user } = await supabase
      .from('users')
      .select('telegram_chat_id')
      .eq('id', userId)
      .single();

    if (!user || !user.telegram_chat_id) {
      return res.status(400).json({ error: 'Telegram account not linked' });
    }

    // Update notification preference
    const { error } = await supabase
      .from('users')
      .update({ telegram_notifications_enabled: enabled })
      .eq('id', userId);

    if (error) {
      console.error('Error toggling notifications:', error);
      return res.status(500).json({ error: 'Failed to update notifications' });
    }

    res.json({ 
      success: true, 
      message: `Notifications ${enabled ? 'enabled' : 'disabled'}`,
      notifications_enabled: enabled
    });
  } catch (error) {
    console.error('Error toggling Telegram notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Helper endpoint to manually queue a test notification (for testing)
export async function sendTestNotification(req: Request, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user's Telegram chat ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('telegram_chat_id, telegram_notifications_enabled, first_name')
      .eq('id', userId)
      .single();

    if (userError || !user || !user.telegram_chat_id) {
      return res.status(400).json({ error: 'Telegram account not linked' });
    }

    if (!user.telegram_notifications_enabled) {
      return res.status(400).json({ error: 'Telegram notifications are disabled' });
    }

    // Queue test notification
    await queueTelegramNotification(
      user.telegram_chat_id,
      'approval',
      {
        type: 'Test Notification',
        approver_name: '6Degree Bot',
        item_name: 'your Telegram integration',
        details: `Hi ${user.first_name}! Your Telegram notifications are working perfectly! 🎉`
      }
    );

    res.json({ 
      success: true, 
      message: 'Test notification queued. Check your Telegram in a few seconds!' 
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}


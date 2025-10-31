import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import {
  sendNewMessageNotification,
  sendConnectionRequestNotification,
  sendConnectionAcceptedNotification,
  sendUnreadMessagesDigest,
} from '../services/emailService';

/**
 * Webhook endpoint to send email when a new message is created
 * Called by database trigger
 */
export async function handleNewMessageEmail(req: Request, res: Response): Promise<void> {
  try {
    const { record } = req.body;
    
    if (!record || !record.receiver_id || !record.sender_id) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Skip system messages or offer approval requests (they have their own notifications)
    if (record.message_type !== 'text' && record.message_type !== 'regular') {
      console.log(`⏭️ Skipping email for message_type: ${record.message_type}`);
      res.json({ success: true, skipped: true });
      return;
    }

    // Get receiver details
    const { data: receiver, error: receiverError } = await supabase
      .from('users')
      .select('email, first_name, last_name, email_notifications_enabled')
      .eq('id', record.receiver_id)
      .single();

    if (receiverError || !receiver) {
      console.error('❌ Error fetching receiver:', receiverError);
      res.status(404).json({ error: 'Receiver not found' });
      return;
    }

    // Check if user has email notifications enabled
    if (receiver.email_notifications_enabled === false) {
      console.log(`⏭️ User ${receiver.email} has email notifications disabled`);
      res.json({ success: true, skipped: true });
      return;
    }

    // Get sender details
    const { data: sender, error: senderError } = await supabase
      .from('users')
      .select('first_name, last_name')
      .eq('id', record.sender_id)
      .single();

    if (senderError || !sender) {
      console.error('❌ Error fetching sender:', senderError);
      res.status(404).json({ error: 'Sender not found' });
      return;
    }

    const senderName = `${sender.first_name} ${sender.last_name}`;
    const recipientName = `${receiver.first_name} ${receiver.last_name}`;

    // Send email notification
    const success = await sendNewMessageNotification({
      recipientEmail: receiver.email,
      recipientName,
      senderName,
      messagePreview: record.content,
    });

    if (success) {
      console.log(`✅ Message notification email sent to ${receiver.email}`);
      res.json({ success: true });
    } else {
      console.error(`❌ Failed to send email to ${receiver.email}`);
      res.status(500).json({ error: 'Failed to send email' });
    }
  } catch (error) {
    console.error('❌ Error in handleNewMessageEmail:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Webhook endpoint to send email when a connection request is created
 * Called by database trigger
 */
export async function handleConnectionRequestEmail(req: Request, res: Response): Promise<void> {
  try {
    const { record } = req.body;
    
    if (!record || !record.receiver_id || !record.sender_id) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Only send email for pending requests
    if (record.status !== 'pending') {
      console.log(`⏭️ Skipping email for status: ${record.status}`);
      res.json({ success: true, skipped: true });
      return;
    }

    // Get receiver details
    const { data: receiver, error: receiverError } = await supabase
      .from('users')
      .select('email, first_name, last_name, email_notifications_enabled')
      .eq('id', record.receiver_id)
      .single();

    if (receiverError || !receiver) {
      console.error('❌ Error fetching receiver:', receiverError);
      res.status(404).json({ error: 'Receiver not found' });
      return;
    }

    // Check if user has email notifications enabled
    if (receiver.email_notifications_enabled === false) {
      console.log(`⏭️ User ${receiver.email} has email notifications disabled`);
      res.json({ success: true, skipped: true });
      return;
    }

    // Get sender details
    const { data: sender, error: senderError } = await supabase
      .from('users')
      .select('first_name, last_name')
      .eq('id', record.sender_id)
      .single();

    if (senderError || !sender) {
      console.error('❌ Error fetching sender:', senderError);
      res.status(404).json({ error: 'Sender not found' });
      return;
    }

    const senderName = `${sender.first_name} ${sender.last_name}`;
    const recipientName = `${receiver.first_name} ${receiver.last_name}`;

    // Send email notification
    const success = await sendConnectionRequestNotification({
      recipientEmail: receiver.email,
      recipientName,
      senderName,
      requestMessage: record.message || '',
    });

    if (success) {
      console.log(`✅ Connection request email sent to ${receiver.email}`);
      res.json({ success: true });
    } else {
      console.error(`❌ Failed to send email to ${receiver.email}`);
      res.status(500).json({ error: 'Failed to send email' });
    }
  } catch (error) {
    console.error('❌ Error in handleConnectionRequestEmail:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Webhook endpoint to send email when a connection request is accepted
 * Called by database trigger
 */
export async function handleConnectionAcceptedEmail(req: Request, res: Response): Promise<void> {
  try {
    const { record } = req.body;
    
    if (!record || !record.sender_id || !record.receiver_id) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Only send email when status changes to accepted
    if (record.status !== 'accepted') {
      console.log(`⏭️ Skipping email for status: ${record.status}`);
      res.json({ success: true, skipped: true });
      return;
    }

    // Get original requester (sender) details
    const { data: sender, error: senderError } = await supabase
      .from('users')
      .select('email, first_name, last_name, email_notifications_enabled')
      .eq('id', record.sender_id)
      .single();

    if (senderError || !sender) {
      console.error('❌ Error fetching sender:', senderError);
      res.status(404).json({ error: 'Sender not found' });
      return;
    }

    // Check if user has email notifications enabled
    if (sender.email_notifications_enabled === false) {
      console.log(`⏭️ User ${sender.email} has email notifications disabled`);
      res.json({ success: true, skipped: true });
      return;
    }

    // Get accepter (receiver) details
    const { data: receiver, error: receiverError } = await supabase
      .from('users')
      .select('first_name, last_name')
      .eq('id', record.receiver_id)
      .single();

    if (receiverError || !receiver) {
      console.error('❌ Error fetching receiver:', receiverError);
      res.status(404).json({ error: 'Receiver not found' });
      return;
    }

    const accepterName = `${receiver.first_name} ${receiver.last_name}`;
    const recipientName = `${sender.first_name} ${sender.last_name}`;

    // Send email notification
    const success = await sendConnectionAcceptedNotification({
      recipientEmail: sender.email,
      recipientName,
      accepterName,
    });

    if (success) {
      console.log(`✅ Connection accepted email sent to ${sender.email}`);
      res.json({ success: true });
    } else {
      console.error(`❌ Failed to send email to ${sender.email}`);
      res.status(500).json({ error: 'Failed to send email' });
    }
  } catch (error) {
    console.error('❌ Error in handleConnectionAcceptedEmail:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Webhook endpoint to send unread messages digest
 * Called by pg_cron hourly job
 */
export async function handleUnreadMessagesDigest(req: Request, res: Response): Promise<void> {
  try {
    const { user_id, email, first_name, last_name, unread_count } = req.body;
    
    if (!user_id || !email || !unread_count) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const recipientName = `${first_name} ${last_name}`;

    // Send digest email
    const success = await sendUnreadMessagesDigest({
      recipientEmail: email,
      recipientName,
      unreadCount: parseInt(unread_count),
    });

    if (success) {
      console.log(`✅ Unread digest sent to ${email} (${unread_count} messages)`);
      res.json({ success: true, unread_count });
    } else {
      console.error(`❌ Failed to send digest to ${email}`);
      res.status(500).json({ error: 'Failed to send email' });
    }
  } catch (error) {
    console.error('❌ Error in handleUnreadMessagesDigest:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}


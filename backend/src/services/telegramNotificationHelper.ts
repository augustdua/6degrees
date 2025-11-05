/**
 * Helper functions to send Telegram notifications for various events
 * These can be called from existing notification services
 */

import { supabase } from '../lib/supabase';
import { queueTelegramNotification } from './telegramService';

/**
 * Send Telegram notification when a user receives a new direct message
 */
export async function notifyMessageReceived(
  recipientUserId: string,
  senderName: string,
  messageContent: string,
  conversationId: string
) {
  try {
    // Get recipient's Telegram settings
    const { data: recipient } = await supabase
      .from('users')
      .select('telegram_chat_id, telegram_notifications_enabled')
      .eq('id', recipientUserId)
      .single();

    if (recipient?.telegram_chat_id && recipient.telegram_notifications_enabled) {
      await queueTelegramNotification(
        recipient.telegram_chat_id,
        'message',
        {
          sender_name: senderName,
          message: messageContent,
          conversation_id: conversationId
        }
      );
    }
  } catch (error) {
    console.error('Error sending Telegram message notification:', error);
  }
}

/**
 * Send Telegram notification when someone sends a connection request
 */
export async function notifyConnectionRequest(
  recipientUserId: string,
  senderName: string,
  message: string,
  requestId: string
) {
  try {
    const { data: recipient } = await supabase
      .from('users')
      .select('telegram_chat_id, telegram_notifications_enabled')
      .eq('id', recipientUserId)
      .single();

    if (recipient?.telegram_chat_id && recipient.telegram_notifications_enabled) {
      await queueTelegramNotification(
        recipient.telegram_chat_id,
        'connection_request',
        {
          sender_name: senderName,
          message: message,
          request_id: requestId
        }
      );
    }
  } catch (error) {
    console.error('Error sending Telegram connection request notification:', error);
  }
}

/**
 * Send Telegram notification when a connection request is approved
 */
export async function notifyConnectionApproved(
  userIdToNotify: string,
  approverName: string,
  details?: string
) {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('telegram_chat_id, telegram_notifications_enabled')
      .eq('id', userIdToNotify)
      .single();

    if (user?.telegram_chat_id && user.telegram_notifications_enabled) {
      await queueTelegramNotification(
        user.telegram_chat_id,
        'approval',
        {
          type: 'Connection',
          approver_name: approverName,
          item_name: 'your connection request',
          details: details || 'You can now message each other!'
        }
      );
    }
  } catch (error) {
    console.error('Error sending Telegram connection approved notification:', error);
  }
}

/**
 * Send Telegram notification when a connection request is rejected
 */
export async function notifyConnectionRejected(
  userIdToNotify: string,
  rejectorName: string,
  reason?: string
) {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('telegram_chat_id, telegram_notifications_enabled')
      .eq('id', userIdToNotify)
      .single();

    if (user?.telegram_chat_id && user.telegram_notifications_enabled) {
      await queueTelegramNotification(
        user.telegram_chat_id,
        'rejection',
        {
          type: 'Connection',
          rejector_name: rejectorName,
          item_name: 'your connection request',
          reason: reason || 'No reason provided'
        }
      );
    }
  } catch (error) {
    console.error('Error sending Telegram connection rejected notification:', error);
  }
}

/**
 * Send Telegram notification when someone bids on an offer
 */
export async function notifyOfferBidReceived(
  offerCreatorId: string,
  bidderName: string,
  offerName: string,
  bidAmount: string,
  bidMessage?: string
) {
  try {
    const { data: creator } = await supabase
      .from('users')
      .select('telegram_chat_id, telegram_notifications_enabled')
      .eq('id', offerCreatorId)
      .single();

    if (creator?.telegram_chat_id && creator.telegram_notifications_enabled) {
      await queueTelegramNotification(
        creator.telegram_chat_id,
        'bid',
        {
          bidder_name: bidderName,
          offer_name: offerName,
          bid_amount: bidAmount,
          message: bidMessage || ''
        }
      );
    }
  } catch (error) {
    console.error('Error sending Telegram bid notification:', error);
  }
}

/**
 * Send Telegram notification when a bid is accepted
 */
export async function notifyBidAccepted(
  bidderUserId: string,
  offerCreatorName: string,
  offerName: string,
  details?: string
) {
  try {
    const { data: bidder } = await supabase
      .from('users')
      .select('telegram_chat_id, telegram_notifications_enabled')
      .eq('id', bidderUserId)
      .single();

    if (bidder?.telegram_chat_id && bidder.telegram_notifications_enabled) {
      await queueTelegramNotification(
        bidder.telegram_chat_id,
        'approval',
        {
          type: 'Bid',
          approver_name: offerCreatorName,
          item_name: `your bid on "${offerName}"`,
          details: details || 'You can now proceed with the intro call!'
        }
      );
    }
  } catch (error) {
    console.error('Error sending Telegram bid accepted notification:', error);
  }
}

/**
 * Send Telegram notification when a bid is rejected
 */
export async function notifyBidRejected(
  bidderUserId: string,
  offerCreatorName: string,
  offerName: string,
  reason?: string
) {
  try {
    const { data: bidder } = await supabase
      .from('users')
      .select('telegram_chat_id, telegram_notifications_enabled')
      .eq('id', bidderUserId)
      .single();

    if (bidder?.telegram_chat_id && bidder.telegram_notifications_enabled) {
      await queueTelegramNotification(
        bidder.telegram_chat_id,
        'rejection',
        {
          type: 'Bid',
          rejector_name: offerCreatorName,
          item_name: `your bid on "${offerName}"`,
          reason: reason || 'The offer creator chose a different bid'
        }
      );
    }
  } catch (error) {
    console.error('Error sending Telegram bid rejected notification:', error);
  }
}

/**
 * Send Telegram notification when someone joins a networking request/chain
 */
export async function notifyRequestReferralJoined(
  requestCreatorId: string,
  referrerName: string,
  requestTarget: string,
  chainLength: number
) {
  try {
    const { data: creator } = await supabase
      .from('users')
      .select('telegram_chat_id, telegram_notifications_enabled')
      .eq('id', requestCreatorId)
      .single();

    if (creator?.telegram_chat_id && creator.telegram_notifications_enabled) {
      await queueTelegramNotification(
        creator.telegram_chat_id,
        'approval',
        {
          type: 'New Referrer',
          approver_name: referrerName,
          item_name: `your request for "${requestTarget}"`,
          details: `You now have ${chainLength} people helping to make this connection!`
        }
      );
    }
  } catch (error) {
    console.error('Error sending Telegram referral joined notification:', error);
  }
}

/**
 * Send Telegram notification when a networking request/chain is completed
 */
export async function notifyRequestCompleted(
  userId: string,
  requestTarget: string,
  rewardAmount: number,
  currency: string = 'INR'
) {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('telegram_chat_id, telegram_notifications_enabled, first_name')
      .eq('id', userId)
      .single();

    if (user?.telegram_chat_id && user.telegram_notifications_enabled) {
      await queueTelegramNotification(
        user.telegram_chat_id,
        'approval',
        {
          type: 'Request Completed',
          approver_name: '6Degree',
          item_name: `"${requestTarget}"`,
          details: `🎉 Congratulations ${user.first_name}! You earned ${currency === 'INR' ? '₹' : '$'}${rewardAmount} in credits!`
        }
      );
    }
  } catch (error) {
    console.error('Error sending Telegram request completed notification:', error);
  }
}

/**
 * Send Telegram notification for intro call scheduled
 */
export async function notifyIntroCallScheduled(
  userId: string,
  otherPersonName: string,
  callDateTime: string
) {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('telegram_chat_id, telegram_notifications_enabled')
      .eq('id', userId)
      .single();

    if (user?.telegram_chat_id && user.telegram_notifications_enabled) {
      await queueTelegramNotification(
        user.telegram_chat_id,
        'approval',
        {
          type: 'Intro Call Scheduled',
          approver_name: otherPersonName,
          item_name: 'your intro call request',
          details: `📅 Your call is scheduled for ${callDateTime}. Check your email for the meeting link!`
        }
      );
    }
  } catch (error) {
    console.error('Error sending Telegram intro call notification:', error);
  }
}

/**
 * Send Telegram notification when someone bids on a networking request
 */
export async function notifyRequestBidReceived(
  requestCreatorId: string,
  bidderName: string,
  requestTarget: string,
  bidMessage: string
) {
  try {
    const { data: creator } = await supabase
      .from('users')
      .select('telegram_chat_id, telegram_notifications_enabled')
      .eq('id', requestCreatorId)
      .single();

    if (creator?.telegram_chat_id && creator.telegram_notifications_enabled) {
      await queueTelegramNotification(
        creator.telegram_chat_id,
        'bid',
        {
          bidder_name: bidderName,
          offer_name: `Networking Request: ${requestTarget}`,
          bid_amount: 'Connection Offer',
          message: bidMessage
        }
      );
    }
  } catch (error) {
    console.error('Error sending Telegram request bid notification:', error);
  }
}


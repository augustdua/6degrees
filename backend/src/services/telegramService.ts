import TelegramBot from 'node-telegram-bot-api';
import { supabase } from '../config/supabase';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const APP_URL = process.env.APP_URL || 'https://6degree.app';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Initialize bot
let bot: TelegramBot | null = null;

// Notification queue processor interval
let queueProcessor: NodeJS.Timeout | null = null;

export function initTelegramBot() {
  if (!BOT_TOKEN) {
    console.warn('⚠️ TELEGRAM_BOT_TOKEN not set, skipping Telegram bot initialization');
    return;
  }

  // Only enable bot on primary instance (to avoid 409 conflicts)
  const ENABLE_BOT = process.env.ENABLE_TELEGRAM_BOT !== 'false';
  if (!ENABLE_BOT) {
    console.log('⏸️ Telegram bot disabled via ENABLE_TELEGRAM_BOT env var');
    return;
  }

  try {
    bot = new TelegramBot(BOT_TOKEN, { polling: true });
    console.log('✅ Telegram bot initialized successfully');

    // Setup command handlers
    setupCommandHandlers();
    
    // Setup message handlers
    setupMessageHandlers();
    
    // Setup callback handlers
    setupCallbackHandlers();
    
    // Start notification queue processor
    startQueueProcessor();
    
    // Handle polling errors
    bot.on('polling_error', (error) => {
      console.error('Telegram polling error:', error);
    });
    
  } catch (error) {
    console.error('❌ Failed to initialize Telegram bot:', error);
  }
}

function setupCommandHandlers() {
  if (!bot) return;

  // /start command - handles both regular start and auto-linking with token
  bot.onText(/\/start(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const username = msg.from?.username;
    const firstName = msg.from?.first_name;
    const linkToken = match?.[1]?.trim();

    // If token is provided, auto-link the account
    if (linkToken && linkToken.startsWith('tg_')) {
      try {
        // Verify token exists and is not used
        const { data: tokenData, error: tokenError } = await supabase
          .from('telegram_link_tokens')
          .select('*')
          .eq('token', linkToken)
          .eq('used', false)
          .single();

        if (tokenError || !tokenData) {
          await bot!.sendMessage(chatId,
            `❌ Invalid or expired link token.\n\n` +
            `Please generate a new link from your 6Degree profile page.`
          );
          return;
        }

        // Check if token is expired
        if (new Date(tokenData.expires_at) < new Date()) {
          await bot!.sendMessage(chatId,
            `❌ This link has expired.\n\n` +
            `Please generate a new link from your 6Degree profile page.`
          );
          return;
        }

        // Get user by email
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, first_name, last_name, email')
          .eq('email', tokenData.email)
          .single();

        if (userError || !user) {
          await bot!.sendMessage(chatId,
            `❌ Account not found. Please make sure you're using the correct link.`
          );
          return;
        }

        // Update token with chat_id and mark as used
        await supabase
          .from('telegram_link_tokens')
          .update({ 
            telegram_chat_id: chatId.toString(),
            telegram_username: username,
            telegram_first_name: firstName,
            used: true 
          })
          .eq('token', linkToken);

        // Link the account
        const { error: linkError } = await supabase
          .from('users')
          .update({
            telegram_chat_id: chatId.toString(),
            telegram_username: username,
            telegram_first_name: firstName,
            telegram_notifications_enabled: true,
            telegram_linked_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (linkError) {
          await bot!.sendMessage(chatId,
            `❌ Failed to link account. Please try again.`
          );
          return;
        }

        // Success!
        await bot!.sendMessage(chatId,
          `✅ <b>Account Linked!</b>\n\n` +
          `Hi ${user.first_name}! Your Telegram is now connected to 6Degree.\n\n` +
          `You'll receive instant notifications for:\n` +
          `  • 💬 New messages\n` +
          `  • 🤝 Connection requests\n` +
          `  • 💼 Offer updates\n` +
          `  • 💰 Bid notifications\n\n` +
          `Use /help to see all commands.`,
          { parse_mode: 'HTML' }
        );
        return;
      } catch (error) {
        console.error('Error auto-linking Telegram:', error);
        await bot!.sendMessage(chatId,
          `❌ An error occurred. Please try again or contact support.`
        );
        return;
      }
    }

    // Regular /start without token - show welcome message
    await bot!.sendMessage(chatId, 
      `👋 Welcome to 6Degree, ${firstName}!\n\n` +
      `I'll help you stay connected with your professional network and never miss important messages or connection opportunities.\n\n` +
      `🔹 Get instant notifications for:\n` +
      `  • New messages\n` +
      `  • Connection requests\n` +
      `  • Offer approvals/rejections\n` +
      `  • Bid updates\n\n` +
      `To link your account, visit your 6Degree profile:`,
      {
        reply_markup: {
          inline_keyboard: [[
            { text: '🔗 Link Your Account', url: `${APP_URL}/profile` }
          ]]
        }
      }
    );
  });

  // /link command
  bot.onText(/\/link\s+(.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const email = match![1].trim().toLowerCase();
    const username = msg.from?.username;
    const firstName = msg.from?.first_name;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      await bot!.sendMessage(chatId,
        '❌ Invalid email format. Please use:\n/link your.email@example.com'
      );
      return;
    }

    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, first_name, last_name')
      .eq('email', email)
      .single();

    if (userError || !user) {
      await bot!.sendMessage(chatId,
        `❌ No 6Degree account found with email: ${email}\n\n` +
        `Please sign up first at: ${APP_URL}/auth`
      );
      return;
    }

    // Generate a secure linking token
    const linkToken = `tg_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;
    
    // Store temporarily in database (expires in 15 minutes)
    const { error: tokenError } = await supabase.from('telegram_link_tokens').insert({
      token: linkToken,
      telegram_chat_id: chatId.toString(),
      telegram_username: username,
      telegram_first_name: firstName,
      email: email,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString()
    });

    if (tokenError) {
      console.error('Error creating link token:', tokenError);
      await bot!.sendMessage(chatId, '❌ Failed to create link. Please try again.');
      return;
    }

    await bot!.sendMessage(chatId,
      `✅ Link request created for ${user.first_name} ${user.last_name}!\n\n` +
      `Click the button below to complete linking (expires in 15 minutes):`,
      {
        reply_markup: {
          inline_keyboard: [[
            { text: '🔗 Complete Linking', url: `${APP_URL}/profile?telegram_token=${linkToken}` }
          ]]
        }
      }
    );
  });

  // /help command
  bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;
    
    await bot!.sendMessage(chatId,
      `📚 <b>6Degree Bot Commands</b>\n\n` +
      `🔗 <b>Account Management</b>\n` +
      `/link [email] - Link your 6Degree account\n` +
      `/unlink - Unlink your account\n` +
      `/status - Check connection status\n\n` +
      `🔔 <b>Notifications</b>\n` +
      `/notify on - Enable notifications\n` +
      `/notify off - Disable notifications\n\n` +
      `💬 <b>Messaging</b>\n` +
      `/messages - Open your messages (full chat interface)\n` +
      `When someone messages you, I'll notify you instantly!\n\n` +
      `❓ <b>Help</b>\n` +
      `/help - Show this message`,
      { parse_mode: 'HTML' }
    );
  });

  // /messages command - Open Mini App
  bot.onText(/\/messages/, async (msg) => {
    const chatId = msg.chat.id;

    // Check if user is linked
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('telegram_chat_id', chatId.toString())
      .single();

    if (!user) {
      await bot!.sendMessage(chatId,
        '❌ Account not linked.\n\n' +
        'Use /link your.email@example.com to connect your account first.'
      );
      return;
    }

    await bot!.sendMessage(chatId,
      '💬 <b>Open Your Messages</b>\n\n' +
      'Click the button below to access your full messaging interface in Telegram!',
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[
            { 
              text: '💬 Open Messages', 
              web_app: { url: `${APP_URL}/telegram/messages` }
            }
          ]]
        }
      }
    );
  });

  // /status command
  bot.onText(/\/status/, async (msg) => {
    const chatId = msg.chat.id;
    
    const { data: user } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, telegram_notifications_enabled')
      .eq('telegram_chat_id', chatId.toString())
      .single();

    if (!user) {
      await bot!.sendMessage(chatId, 
        '❌ Account not linked.\n\n' +
        'Use /link your.email@example.com to connect your account.'
      );
      return;
    }

    const statusEmoji = user.telegram_notifications_enabled ? '✅' : '❌';
    const statusText = user.telegram_notifications_enabled ? 'ENABLED' : 'DISABLED';

    await bot!.sendMessage(chatId,
      `✅ <b>Account Linked Successfully</b>\n\n` +
      `👤 Name: ${user.first_name} ${user.last_name}\n` +
      `📧 Email: ${user.email}\n` +
      `🔔 Notifications: ${statusEmoji} ${statusText}\n\n` +
      `${!user.telegram_notifications_enabled ? 'Use /notify on to enable notifications.' : 'You\'ll receive instant updates about messages and connections!'}`,
      { parse_mode: 'HTML' }
    );
  });

  // /notify command
  bot.onText(/\/notify\s+(on|off)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const action = match![1];
    const enabled = action === 'on';

    const { error } = await supabase
      .from('users')
      .update({ telegram_notifications_enabled: enabled })
      .eq('telegram_chat_id', chatId.toString());

    if (error) {
      await bot!.sendMessage(chatId, '❌ Failed to update settings. Make sure your account is linked.');
      return;
    }

    await bot!.sendMessage(chatId,
      enabled 
        ? '✅ <b>Notifications Enabled!</b>\n\nYou\'ll now receive instant alerts for:\n• New messages\n• Connection requests\n• Offer updates\n• Bid notifications'
        : '🔕 <b>Notifications Disabled</b>\n\nYou can re-enable them anytime with /notify on',
      { parse_mode: 'HTML' }
    );
  });

  // /unlink command
  bot.onText(/\/unlink/, async (msg) => {
    const chatId = msg.chat.id;

    const { error } = await supabase
      .from('users')
      .update({
        telegram_chat_id: null,
        telegram_username: null,
        telegram_first_name: null,
        telegram_notifications_enabled: false
      })
      .eq('telegram_chat_id', chatId.toString());

    if (error) {
      await bot!.sendMessage(chatId, '❌ Failed to unlink. Please try again.');
      return;
    }

    await bot!.sendMessage(chatId,
      '✅ Account unlinked successfully.\n\n' +
      'You can link again anytime with /link'
    );
  });
}

function setupMessageHandlers() {
  if (!bot) return;

  // Handle regular text messages - enable two-way chat
  bot.on('message', async (msg) => {
    // Skip if it's a command
    if (msg.text?.startsWith('/')) return;

    const chatId = msg.chat.id;
    const messageText = msg.text;

    if (!messageText) return;

    // Check if user is linked
    const { data: user } = await supabase
      .from('users')
      .select('id, first_name')
      .eq('telegram_chat_id', chatId.toString())
      .single();

    if (!user) {
      await bot!.sendMessage(chatId,
        '👋 Hi! To use 6Degree bot, please link your account first:\n' +
        '/link your.email@example.com'
      );
      return;
    }

    // Check for active conversation context
    const { data: context } = await supabase
      .from('telegram_conversation_context')
      .select('active_conversation_id, last_activity')
      .eq('telegram_chat_id', chatId.toString())
      .single();

    // Check if context is still valid (within last 30 minutes)
    const contextExpired = context?.last_activity 
      ? (Date.now() - new Date(context.last_activity).getTime()) > 30 * 60 * 1000
      : true;

    if (!context?.active_conversation_id || contextExpired) {
      await bot!.sendMessage(chatId,
        '💬 To start messaging someone:\n\n' +
        '1️⃣ Wait for them to send you a message\n' +
        '2️⃣ Reply within 30 minutes\n\n' +
        'Or open the full chat in the app:',
        {
          reply_markup: {
            inline_keyboard: [[
              { text: '📱 Open Messages', url: `${APP_URL}/messages` }
            ]]
          }
        }
      );
      return;
    }

    // Send the message!
    const success = await sendMessageFromTelegram(
      chatId.toString(),
      context.active_conversation_id,
      messageText
    );

    if (success) {
      await bot!.sendMessage(chatId, '✅ Message sent!', {
        reply_markup: {
          inline_keyboard: [[
            { text: '📱 Open Chat', url: `${APP_URL}/messages?c=${context.active_conversation_id}` }
          ]]
        }
      });
    } else {
      await bot!.sendMessage(chatId, 
        '❌ Failed to send message. Please try again or use the app.',
        {
          reply_markup: {
            inline_keyboard: [[
              { text: '📱 Open Messages', url: `${APP_URL}/messages` }
            ]]
          }
        }
      );
    }
  });
}

function setupCallbackHandlers() {
  if (!bot) return;

  bot.on('callback_query', async (query) => {
    const data = query.data;
    const chatId = query.message?.chat.id;

    if (!data || !chatId) return;

    try {
      // Handle quick reply button
      if (data.startsWith('quick_reply_')) {
        const conversationId = data.split('_')[2];
        
        // Store conversation context
        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('telegram_chat_id', chatId.toString())
          .single();

        if (user) {
          await supabase
            .from('telegram_conversation_context')
            .upsert({
              telegram_chat_id: chatId.toString(),
              user_id: user.id,
              active_conversation_id: conversationId,
              last_activity: new Date().toISOString()
            }, {
              onConflict: 'telegram_chat_id'
            });
        }
        
        await bot!.sendMessage(chatId,
          '💬 <b>Quick Reply Options:</b>\n\nChoose a response or type your own message:',
          {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [{ text: '👍 Thanks! Sounds good', callback_data: `send_${conversationId}_msg1` }],
                [{ text: '📞 Let\'s set up a call', callback_data: `send_${conversationId}_msg2` }],
                [{ text: '⏰ What\'s your availability?', callback_data: `send_${conversationId}_msg3` }],
                [{ text: '✅ I can help with this', callback_data: `send_${conversationId}_msg4` }],
                [{ text: '📱 Open Full Chat', url: `${APP_URL}/messages?c=${conversationId}` }]
              ]
            }
          }
        );
        await bot!.answerCallbackQuery(query.id);
      }

      // Handle sending quick reply
      if (data.startsWith('send_')) {
        const parts = data.split('_');
        const conversationId = parts[1];
        const msgType = parts[2];
        
        const quickMessages: Record<string, string> = {
          msg1: 'Thanks! Sounds good. Looking forward to connecting.',
          msg2: 'Let\'s set up a call. What time works best for you?',
          msg3: 'What\'s your availability for a quick chat?',
          msg4: 'I can help with this. Let me know what you need.'
        };

        const message = quickMessages[msgType];
        
        if (message) {
          const success = await sendMessageFromTelegram(chatId.toString(), conversationId, message);
          if (success) {
            await bot!.answerCallbackQuery(query.id, { text: '✓ Message sent!' });
            await bot!.sendMessage(chatId, `✅ Sent: "${message}"`);
          } else {
            await bot!.answerCallbackQuery(query.id, { text: '❌ Failed to send' });
          }
        }
      }

      // Handle view conversation
      if (data.startsWith('view_')) {
        const conversationId = data.split('_')[1];
        await bot!.answerCallbackQuery(query.id, {
          url: `${APP_URL}/messages?c=${conversationId}`
        });
      }
    } catch (error) {
      console.error('Error handling callback query:', error);
      await bot!.answerCallbackQuery(query.id, { text: '❌ Error occurred' });
    }
  });
}

async function sendMessageFromTelegram(
  telegramChatId: string,
  conversationId: string,
  content: string
): Promise<boolean> {
  try {
    // Get user ID from telegram_chat_id
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('telegram_chat_id', telegramChatId)
      .single();

    if (!user) {
      console.error('User not found for telegram_chat_id:', telegramChatId);
      return false;
    }

    // Get conversation details to find receiver
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('user1_id, user2_id')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      console.error('Conversation not found:', conversationId, convError);
      return false;
    }

    // Determine receiver (the other person in the conversation)
    const receiverId = conversation.user1_id === user.id 
      ? conversation.user2_id 
      : conversation.user1_id;

    // Insert message with all required fields
    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        receiver_id: receiverId,
        content: content,
        message_type: 'text',  // Regular text message
        metadata: { source: 'telegram' }
      });

    if (error) {
      console.error('Error inserting message:', error);
      return false;
    }

    // Update conversation context timestamp
    await supabase
      .from('telegram_conversation_context')
      .update({ last_activity: new Date().toISOString() })
      .eq('telegram_chat_id', telegramChatId);

    return true;
  } catch (error) {
    console.error('Failed to send message from Telegram:', error);
    return false;
  }
}

// Queue processor - sends notifications from the queue
function startQueueProcessor() {
  if (queueProcessor) {
    clearInterval(queueProcessor);
  }

  // Process queue every 2 seconds
  queueProcessor = setInterval(async () => {
    await processNotificationQueue();
  }, 2000);

  console.log('✅ Telegram notification queue processor started');
}

async function processNotificationQueue() {
  if (!bot) return;

  try {
    // Fetch pending notifications (limit to 10 at a time)
    const { data: notifications, error } = await supabase
      .from('telegram_notification_queue')
      .select('*')
      .eq('status', 'pending')
      .lt('attempts', 3) // Max 3 retry attempts
      .order('created_at', { ascending: true })
      .limit(10);

    if (error || !notifications || notifications.length === 0) return;

    for (const notification of notifications) {
      try {
        // Update attempt count
        await supabase
          .from('telegram_notification_queue')
          .update({
            attempts: notification.attempts + 1,
            last_attempt_at: new Date().toISOString()
          })
          .eq('id', notification.id);

        // Send notification based on type
        let success = false;
        switch (notification.notification_type) {
          case 'message':
            success = await sendMessageNotification(
              notification.telegram_chat_id,
              notification.payload
            );
            break;
          case 'connection_request':
            success = await sendConnectionRequestNotification(
              notification.telegram_chat_id,
              notification.payload
            );
            break;
          case 'approval':
            success = await sendApprovalNotification(
              notification.telegram_chat_id,
              notification.payload
            );
            break;
          case 'rejection':
            success = await sendRejectionNotification(
              notification.telegram_chat_id,
              notification.payload
            );
            break;
          case 'bid':
            success = await sendBidNotification(
              notification.telegram_chat_id,
              notification.payload
            );
            break;
          default:
            console.warn(`Unknown notification type: ${notification.notification_type}`);
        }

        // Update status
        if (success) {
          await supabase
            .from('telegram_notification_queue')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString()
            })
            .eq('id', notification.id);
        } else {
          // Mark as failed after 3 attempts
          if (notification.attempts + 1 >= 3) {
            await supabase
              .from('telegram_notification_queue')
              .update({ status: 'failed' })
              .eq('id', notification.id);
          }
        }
      } catch (error) {
        console.error(`Error processing notification ${notification.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in queue processor:', error);
  }
}

// Notification senders for different types
async function sendMessageNotification(chatId: string, payload: any): Promise<boolean> {
  if (!bot) return false;

  try {
    const { sender_name, message, conversation_id, sender_id } = payload;
    const preview = message.length > 150 ? message.substring(0, 150) + '...' : message;

    // Store conversation context so user can reply directly
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('telegram_chat_id', chatId)
      .single();

    if (user && conversation_id) {
      await supabase
        .from('telegram_conversation_context')
        .upsert({
          telegram_chat_id: chatId,
          user_id: user.id,
          active_conversation_id: conversation_id,
          last_activity: new Date().toISOString()
        }, {
          onConflict: 'telegram_chat_id'
        });
    }

    await bot.sendMessage(chatId,
      `💬 <b>New message from ${sender_name}</b>\n\n` +
      `<i>"${preview}"</i>\n\n` +
      `💡 <i>You can reply by just typing your message here, or open the full chat!</i>`,
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '💬 Quick Reply', callback_data: `quick_reply_${conversation_id}` },
              { text: '📱 Open Chat', web_app: { url: `${APP_URL}/telegram/messages?c=${conversation_id}` } }
            ]
          ]
        }
      }
    );
    return true;
  } catch (error) {
    console.error('Error sending message notification:', error);
    return false;
  }
}

async function sendConnectionRequestNotification(chatId: string, payload: any): Promise<boolean> {
  if (!bot) return false;

  try {
    const { sender_name, message, request_id } = payload;

    await bot.sendMessage(chatId,
      `🤝 <b>New Connection Request from ${sender_name}</b>\n\n` +
      `<i>${message || 'Wants to connect with you'}</i>`,
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ Accept', url: `${APP_URL}/dashboard?tab=connections&action=accept&id=${request_id}` },
              { text: '❌ Decline', url: `${APP_URL}/dashboard?tab=connections&action=decline&id=${request_id}` }
            ]
          ]
        }
      }
    );
    return true;
  } catch (error) {
    console.error('Error sending connection request notification:', error);
    return false;
  }
}

async function sendApprovalNotification(chatId: string, payload: any): Promise<boolean> {
  if (!bot) return false;

  try {
    const { type, approver_name, item_name, details } = payload;

    await bot.sendMessage(chatId,
      `✅ <b>${type} Approved!</b>\n\n` +
      `${approver_name} approved your ${item_name}.\n\n` +
      `${details || ''}`,
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[
            { text: '📱 View Details', url: `${APP_URL}/dashboard` }
          ]]
        }
      }
    );
    return true;
  } catch (error) {
    console.error('Error sending approval notification:', error);
    return false;
  }
}

async function sendRejectionNotification(chatId: string, payload: any): Promise<boolean> {
  if (!bot) return false;

  try {
    const { type, rejector_name, item_name, reason } = payload;

    await bot.sendMessage(chatId,
      `❌ <b>${type} Declined</b>\n\n` +
      `${rejector_name} declined your ${item_name}.\n\n` +
      `${reason ? `Reason: ${reason}` : ''}`,
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[
            { text: '📱 View Details', url: `${APP_URL}/dashboard` }
          ]]
        }
      }
    );
    return true;
  } catch (error) {
    console.error('Error sending rejection notification:', error);
    return false;
  }
}

async function sendBidNotification(chatId: string, payload: any): Promise<boolean> {
  if (!bot) return false;

  try {
    const { bidder_name, offer_name, bid_amount, message } = payload;

    await bot.sendMessage(chatId,
      `💰 <b>New Bid on Your Offer!</b>\n\n` +
      `${bidder_name} placed a bid on "${offer_name}"\n` +
      `Amount: ${bid_amount}\n\n` +
      `${message ? `Message: "${message}"` : ''}`,
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[
            { text: '📱 View Bid', url: `${APP_URL}/dashboard?tab=bids` }
          ]]
        }
      }
    );
    return true;
  } catch (error) {
    console.error('Error sending bid notification:', error);
    return false;
  }
}

// Helper function to queue any notification
export async function queueTelegramNotification(
  telegramChatId: string,
  notificationType: string,
  payload: any
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('telegram_notification_queue')
      .insert({
        telegram_chat_id: telegramChatId,
        notification_type: notificationType,
        payload: payload
      });

    return !error;
  } catch (error) {
    console.error('Error queuing Telegram notification:', error);
    return false;
  }
}

// Stop the bot gracefully
export function stopTelegramBot() {
  if (queueProcessor) {
    clearInterval(queueProcessor);
    queueProcessor = null;
  }
  
  if (bot) {
    bot.stopPolling();
    bot = null;
    console.log('🛑 Telegram bot stopped');
  }
}

export { bot };

